import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import swaggerUi from 'swagger-ui-express';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { db } from './db.js';
import { hashPassword, verifyPassword } from './password.js';
import { answerChat } from './chat.js';
import { advance, scope, ticketFields } from './tickets.js';

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) throw Error('JWT_SECRET debe tener al menos 32 caracteres.');
const issuer = 'lamilla-api';
const dummyHash = await hashPassword(randomBytes(24).toString('hex'));
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const spec = JSON.parse(readFileSync(new URL('./openapi.json', import.meta.url), 'utf8'));
app.use('/api/docs', helmet({ contentSecurityPolicy: { directives: { scriptSrc: ["'self'", "'unsafe-inline'"], upgradeInsecureRequests: null } } }), swaggerUi.serve, swaggerUi.setup(spec, { swaggerOptions: { persistAuthorization: false } }));
app.use(helmet({ strictTransportSecurity: false }));
app.use(express.json({ limit: '24kb' }));

const fields = { id: true, email: true, name: true, role: true, campus: true };
const category = z.enum(['ACCESS', 'ENROLLMENT', 'CAMPUS', 'OTHER']);
const bodyText = (min, max) => z.string().trim().min(min).max(max);
const id = z.string().uuid();
const limited = (max, options = {}) => rateLimit({
  windowMs: 60_000, limit: max, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }, ...options,
});

function body(schema, handler) {
  return (req, res) => handler(schema.parse(req.body), req, res);
}

async function authenticate(req, res, next) {
  const token = /^Bearer (\S+)$/.exec(req.get('authorization') ?? '')?.[1];
  let subject;
  try {
    subject = jwt.verify(token, secret, { algorithms: ['HS256'], issuer, audience: 'lamilla-web' }).sub;
  } catch {
    return res.status(401).json({ error: 'Inicia sesión para continuar.' });
  }
  const user = await db.user.findUnique({ where: { id: subject }, select: fields });
  if (!user) return res.status(401).json({ error: 'Sesión no disponible.' });
  req.user = user;
  return next();
}

app.get('/api/health', async (_req, res) => {
  try {
    await db.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});
app.get('/api/openapi.json', (_req, res) => res.json(spec));

app.post('/api/auth/login', limited(20), body(z.object({
  email: bodyText(3, 150).email().transform(value => value.toLowerCase()),
  password: z.string().min(1).max(128),
}).strict(), async (data, _req, res) => {
  const user = await db.user.findUnique({ where: { email: data.email }, select: { ...fields, passwordHash: true } });
  const matches = await verifyPassword(data.password, user?.passwordHash ?? dummyHash);
  if (!user || !matches) return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  const { passwordHash, ...profile } = user;
  const token = jwt.sign({}, secret, { subject: profile.id, issuer, audience: 'lamilla-web', expiresIn: '1h' });
  return res.set('Cache-Control', 'no-store').json({ token, user: profile });
}));

app.use('/api', authenticate, (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.get('/api/tickets', async (req, res) => {
  const { page, status } = z.object({
    page: z.coerce.number().int().min(1).max(1000).default(1),
    status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']).optional(),
  }).strict().parse(req.query);
  const perPage = 25;
  const tickets = await db.ticket.findMany({
    where: { ...scope(req.user), status }, select: ticketFields,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * perPage, take: perPage + 1,
  });
  res.json({ items: tickets.slice(0, perPage), page, hasNext: tickets.length > perPage && page < 1000 });
});
app.post('/api/tickets', body(z.object({
  title: bodyText(5, 120), description: bodyText(10, 2000), category,
}).strict(), async (data, req, res) => {
  if (req.user.role !== 'STUDENT') return res.status(403).json({ error: 'Solo estudiantes pueden crear solicitudes.' });
  const ticket = await db.ticket.create({
    data: { ...data, campus: req.user.campus, ownerId: req.user.id }, select: ticketFields,
  });
  return res.status(201).location('/api/tickets/' + ticket.id).json(ticket);
}));
app.get('/api/tickets/:id', async (req, res) => {
  const ticket = await db.ticket.findFirst({
    where: { id: id.parse(req.params.id), ...scope(req.user) },
    select: {
      ...ticketFields, description: true, owner: { select: { name: true } },
      notifications: { orderBy: { createdAt: 'asc' }, select: { id: true, status: true, createdAt: true } },
    },
  });
  if (!ticket) return res.status(404).json({ error: 'Solicitud no encontrada.' });
  return res.json(ticket);
});
app.patch('/api/tickets/:id/status', body(z.object({ status: z.enum(['IN_PROGRESS', 'RESOLVED']) }).strict(), async (data, req, res) => {
  if (req.user.role !== 'AGENT') return res.status(403).json({ error: 'Solo agentes pueden cambiar el estado.' });
  const result = await advance(id.parse(req.params.id), req.user, data.status);
  return result.ticket ? res.json(result.ticket) : res.status(result.code).json({ error: result.error });
}));
app.post('/api/chat', limited(12, { keyGenerator: req => req.user.id }), body(
  z.object({ message: bodyText(2, 500) }).strict(),
  async ({ message }, _req, res) => res.json(await answerChat(message, {
    key: process.env.OPENROUTER_API_KEY?.trim(), model: process.env.OPENROUTER_MODEL,
  })),
));
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
app.use((error, _req, res, _next) => {
  if (error instanceof z.ZodError || error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Datos inválidos. Revisa los campos enviados.' });
  }
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'La solicitud supera el tamaño permitido.' });
  console.error('Error de API', error.code ?? error.name);
  return res.status(500).json({ error: 'Ocurrió un error interno.' });
});

const server = app.listen(3000, '0.0.0.0', () => console.log('API Proyecto Final en puerto 3000'));
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => server.close(() => void db.$disconnect()));

import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const base = process.env.BASE_URL ?? 'http://localhost:8097';
const cases = [];
async function run(name, verify) {
  const start = performance.now();
  try {
    await verify();
    cases.push({ name, pass: true, ms: Math.round(performance.now() - start) });
  } catch (error) {
    cases.push({ name, pass: false, ms: Math.round(performance.now() - start), error: error.message });
  }
}
async function call(path, { token, method = 'GET', body, status = 200 } = {}) {
  const result = await fetch(base + '/api' + path, {
    method, signal: AbortSignal.timeout(12000),
    headers: { ...(token && { Authorization: 'Bearer ' + token }), ...(body && { 'Content-Type': 'application/json' }) },
    body: body && JSON.stringify(body),
  });
  assert.equal(result.status, status, method + ' ' + path + ' devolvió ' + result.status);
  return await result.json();
}
const login = async (alias, status = 200, password = 'LamillaDemo2026!') =>
  call('/auth/login', { method: 'POST', status, body: { email: alias + '@proyectofinal.test', password } });
const payload = { title: 'Prueba de aceptación ' + new Date().toISOString(), description: 'Caso sintético para verificar el ciclo de atención.', category: 'ACCESS' };
let student, otherStudent, agent, otherAgent, ticket;

await run('Inicio web, Swagger y salud de PostgreSQL', async () => {
  const home = await fetch(base, { signal: AbortSignal.timeout(10000) });
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.match(html, /Soporte universitario/);
  const bundle = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
  assert.ok(bundle, 'Vite debe publicar el módulo compilado');
  assert.equal((await fetch(base + bundle)).status, 200);
  const swagger = await fetch(base + '/api/docs/');
  assert.equal(swagger.status, 200);
  assert.match(await swagger.text(), /Swagger UI/);
  assert.equal((await call('/openapi.json')).openapi, '3.0.3');
  assert.equal((await call('/health')).status, 'ok');
});
await run('Inicio de sesión de cuatro perfiles', async () => {
  [student, otherStudent, agent, otherAgent] = await Promise.all(['estudiante', 'norte', 'agente', 'agente.norte'].map(alias => login(alias)));
  assert.equal(student.user.role, 'STUDENT');
  assert.equal(agent.user.role, 'AGENT');
  assert.equal(otherAgent.user.campus, 'NORTE');
  assert.ok(!('passwordHash' in student.user));
});
await run('Credenciales inválidas y autenticación obligatoria', async () => {
  await login('estudiante', 401, 'Credencial incorrecta');
  await call('/tickets', { status: 401 });
});
await run('Validación de entrada y creación de solicitud', async () => {
  await call('/tickets', { token: student.token, method: 'POST', body: { ...payload, title: 'x' }, status: 400 });
  ticket = await call('/tickets', { token: student.token, method: 'POST', body: payload, status: 201 });
  assert.equal(ticket.status, 'OPEN');
});
await run('Visibilidad por propietario y sede', async () => {
  assert.ok((await call('/tickets?status=OPEN', { token: agent.token })).items.some(item => item.id === ticket.id));
  assert.equal((await call('/tickets/' + ticket.id, { token: student.token })).id, ticket.id);
  await call('/tickets/' + ticket.id, { token: otherStudent.token, status: 404 });
  await call('/tickets/' + ticket.id, { token: otherAgent.token, status: 404 });
});
await run('Permisos y transiciones válidas', async () => {
  const path = '/tickets/' + ticket.id + '/status';
  const change = (token, value, status) => call(path, { token, method: 'PATCH', body: { status: value }, status });
  await change(student.token, 'IN_PROGRESS', 403);
  await change(otherAgent.token, 'IN_PROGRESS', 404);
  await change(agent.token, 'RESOLVED', 409);
  const updates = await Promise.all([1, 2].map(async () => {
    const result = await fetch(base + '/api' + path, {
      method: 'PATCH', signal: AbortSignal.timeout(8000),
      headers: { Authorization: 'Bearer ' + agent.token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });
    return result.status;
  }));
  assert.deepEqual(updates.sort(), [200, 409]);
  assert.equal((await change(agent.token, 'RESOLVED', 200)).status, 'RESOLVED');
});
await run('Worker entrega dos notificaciones sin duplicarlas', async () => {
  for (let attempt = 0; attempt < 20; attempt++) {
    const result = await call('/tickets/' + ticket.id, { token: student.token });
    if (result.notifications.length >= 2) {
      assert.deepEqual(result.notifications.map(item => item.status), ['IN_PROGRESS', 'RESOLVED']);
      return;
    }
    await delay(500);
  }
  assert.fail('El worker no entregó ambas notificaciones en 10 s');
});
await run('Chat integrado y validación del mensaje', async () => {
  const response = await call('/chat', { token: student.token, method: 'POST', body: { message: '¿Cómo recupero mi contraseña?' } });
  assert.ok(['faq', 'openrouter'].includes(response.source));
  assert.ok(response.answer.length > 15);
  await call('/chat', { token: student.token, method: 'POST', body: { message: '' }, status: 400 });
});

const output = { date: new Date().toISOString(), base, cases };
await mkdir(new URL('../evidencias/', import.meta.url), { recursive: true });
await writeFile(new URL('../evidencias/aceptacion.json', import.meta.url), JSON.stringify(output, null, 2));
console.table(cases);
if (cases.some(item => !item.pass)) process.exitCode = 1;

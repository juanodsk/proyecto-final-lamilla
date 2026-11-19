import { db } from './db.js';
import { hashPassword } from './password.js';

try {
  if (process.env.DEMO_SEED === 'true') {
    const passwordHash = await hashPassword('LamillaDemo2026!');
    for (const [alias, name, role, campus] of [
      ['estudiante', 'Lucía Torres', 'STUDENT', 'CENTRAL'],
      ['agente', 'Daniel Rojas', 'AGENT', 'CENTRAL'],
      ['norte', 'Sara Ortiz', 'STUDENT', 'NORTE'],
      ['agente.norte', 'Andrés Pérez', 'AGENT', 'NORTE'],
    ]) {
      const email = alias + '@proyectofinal.test';
      await db.$transaction(async tx => {
        await tx.user.updateMany({
          where: { email: alias + '@lamilla.test' },
          data: { email },
        });
        await tx.user.upsert({ where: { email }, update: {}, create: { email, name, role, campus, passwordHash } });
      });
    }
  }
} finally {
  await db.$disconnect();
}

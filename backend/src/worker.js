import { setTimeout as delay } from 'node:timers/promises';
import { db } from './db.js';

let stopping = false;
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => { stopping = true; });

async function processEvent() {
  return db.$transaction(async tx => {
    const [event] = await tx.$queryRaw`
      SELECT "id", "ticketId", "status" FROM "OutboxEvent"
      WHERE "processedAt" IS NULL ORDER BY "createdAt", "id"
      FOR UPDATE SKIP LOCKED LIMIT 1
    `;
    if (!event) return false;
    await tx.notification.create({ data: { eventId: event.id, ticketId: event.ticketId, status: event.status } });
    await tx.outboxEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
    return true;
  });
}

try {
  while (!stopping) {
    try {
      if (!await processEvent()) await delay(500);
    } catch (error) {
      console.error('Evento pendiente, reintento en 3 s', error.code ?? error.name);
      await delay(3000);
    }
  }
} finally {
  await db.$disconnect();
}

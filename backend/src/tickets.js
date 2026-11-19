import { db } from './db.js';

export const scope = user => user.role === 'AGENT' ? { campus: user.campus } : { ownerId: user.id };
export const ticketFields = {
  id: true, title: true, category: true, status: true, campus: true, createdAt: true, updatedAt: true,
};
const nextStatus = { OPEN: 'IN_PROGRESS', IN_PROGRESS: 'RESOLVED' };

export async function advance(ticketId, agent, status) {
  return db.$transaction(async tx => {
    const where = { id: ticketId, ...scope(agent) };
    const ticket = await tx.ticket.findFirst({ where, select: { status: true } });
    if (!ticket) return { code: 404, error: 'Solicitud no encontrada.' };
    if (nextStatus[ticket.status] !== status) return { code: 409, error: 'El cambio de estado no es válido.' };

    const update = await tx.ticket.updateMany({ where: { ...where, status: ticket.status }, data: { status } });
    if (!update.count) return { code: 409, error: 'El estado cambió. Actualiza la solicitud.' };

    await tx.outboxEvent.create({ data: { ticketId, status } });
    return { code: 200, ticket: await tx.ticket.findUnique({ where: { id: ticketId }, select: ticketFields }) };
  });
}

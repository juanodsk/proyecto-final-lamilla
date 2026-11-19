export const topics = [
  { pattern: /matricul|inscrip|asignatur/, answer: 'Consulta el calendario académico de tu sede. Si tienes un bloqueo de matrícula, crea una solicitud en la categoría Matrícula.' },
  { pattern: /clave|contrasen|acceso|correo|cuenta/, answer: 'Usa la recuperación de contraseña del portal institucional. Si el problema persiste, crea una solicitud en Acceso digital. Nunca incluyas tu contraseña.' },
  { pattern: /estado|seguimiento|solicitud|ticket|notifica/, answer: 'Abre Mis solicitudes y selecciona el caso para ver su estado y las notificaciones. Los estados son Abierta, En curso y Resuelta.' },
  { pattern: /sede|campus|horario/, answer: 'La plataforma atiende las sedes Central y Norte. Confirma horarios y ubicaciones con la oficina de tu sede.' },
];

export function faq(message) {
  const normalized = message.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  return topics.find(topic => topic.pattern.test(normalized))?.answer
    ?? 'Puedo orientarte sobre acceso digital, matrícula, sedes y seguimiento. Si tu caso requiere atención personalizada, crea una solicitud.';
}

export async function answerChat(message, { key, model, request = fetch } = {}) {
  if (key) {
    try {
      const response = await request('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          model: model || 'openrouter/auto',
          max_tokens: 220,
          messages: [
            { role: 'system', content: 'Eres el asistente de soporte universitario Proyecto Final. Responde en español. Solo orienta con esta base: ' + topics.map(item => item.answer).join(' ') + ' No inventes plazos ni horarios. No solicites datos personales. No puedes ver ni modificar solicitudes. Si no sabes, indica cómo crear una solicitud.' },
            { role: 'user', content: message },
          ],
        }),
      });
      if (response.ok) {
        const result = await response.json();
        const answer = result.choices?.[0]?.message?.content;
        if (typeof answer === 'string' && answer.trim()) return { answer: answer.trim().slice(0, 2000), source: 'openrouter' };
      }
    } catch {
      // La base local mantiene disponible la orientación cuando falla el proveedor.
    }
  }
  return { answer: faq(message), source: 'faq' };
}

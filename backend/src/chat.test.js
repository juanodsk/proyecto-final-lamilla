import assert from 'node:assert/strict';
import test from 'node:test';
import { answerChat } from './chat.js';

test('reconoce matrícula con tilde sin proveedor', async () => {
  const result = await answerChat('¿Cómo hago la matrícula?');
  assert.equal(result.source, 'faq');
  assert.match(result.answer, /calendario/);
});

test('degrada a FAQ ante error del proveedor', async () => {
  const result = await answerChat('restablecer contraseña', { key: 'test', request: async () => { throw Error('timeout'); } });
  assert.equal(result.source, 'faq');
  assert.match(result.answer, /recuperación/);
});

test('adapta una respuesta del proveedor simulado', async () => {
  const result = await answerChat('¿Cómo consulto mi solicitud?', {
    key: 'test',
    request: async (_url, options) => {
      assert.equal(options.headers.Authorization, 'Bearer test');
      assert.equal(JSON.parse(options.body).messages[1].role, 'user');
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'Abre Mis solicitudes.' } }] }) };
    },
  });
  assert.deepEqual(result, { source: 'openrouter', answer: 'Abre Mis solicitudes.' });
});

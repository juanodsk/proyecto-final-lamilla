import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.env.BASE_URL || 'http://localhost:8097';
const output = new URL('../evidencias/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH, headless: true });
const cases = [];
const title = 'Acceso al aula virtual ' + new Date().toISOString().slice(11, 23);
const password = 'LamillaDemo2026!';

async function login(page, alias) {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Correo institucional').fill(alias + '@lamilla.test');
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).waitFor();
}
async function screenshot(page, filename) {
  await page.screenshot({ path: join('evidencias', filename), animations: 'disabled' });
}
try {
  const student = await browser.newPage({ viewport: { width: 1366, height: 850 } });
  await student.goto(base);
  await screenshot(student, '01-inicio.png');
  await login(student, 'estudiante');
  await student.getByRole('button', { name: 'Nueva solicitud' }).click();
  await student.getByLabel('Asunto').fill(title);
  await student.getByLabel('Categoría').selectOption('ACCESS');
  await student.getByLabel('Descripción').fill('No puedo ingresar al aula virtual desde mi cuenta de demostración.');
  await student.getByRole('button', { name: 'Enviar solicitud' }).click();
  await student.getByRole('heading', { name: title }).waitFor();
  cases.push('El estudiante crea una solicitud y abre su detalle.');
  await student.getByRole('button', { name: '¿Cómo recupero mi contraseña?' }).click();
  await student.getByRole('log').getByText(/Guía de Proyecto Final|Respuesta de IA/).waitFor();
  cases.push('El chat presenta una respuesta y muestra su fuente.');
  await screenshot(student, '02-estudiante.png');

  const agent = await browser.newPage({ viewport: { width: 1366, height: 850 } });
  await login(agent, 'agente');
  await agent.getByRole('button', { name: new RegExp(title.replaceAll('.', '\\.')) }).click();
  await agent.getByRole('button', { name: 'Iniciar atención' }).click();
  await agent.getByRole('button', { name: 'Marcar como resuelta' }).click();
  await agent.locator('.detail .RESOLVED').waitFor();
  await screenshot(agent, '03-agente.png');
  await student.getByRole('button', { name: 'Actualizar' }).click();
  await student.locator('.detail .RESOLVED').waitFor();
  for (let i = 0; i < 12 && await student.locator('.timeline li').count() < 2; i++) {
    await student.waitForTimeout(300);
    await student.getByRole('button', { name: 'Actualizar' }).click();
  }
  assert.equal(await student.locator('.timeline li').count(), 2);
  cases.push('El agente completa la transición y el estudiante recibe ambas notificaciones.');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1 });
  await mobile.goto(base);
  await mobile.keyboard.press('Tab');
  assert.equal(await mobile.locator(':focus').textContent(), 'Ir al contenido');
  await mobile.keyboard.press('Enter');
  assert.equal(new URL(mobile.url()).hash, '#main');
  await login(mobile, 'norte');
  await mobile.getByRole('heading', { name: 'Mis solicitudes' }).waitFor();
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await screenshot(mobile, '04-movil.png');
  cases.push('El enlace de salto funciona con teclado y el panel móvil evita desplazamiento horizontal.');

  const docs = await browser.newPage();
  await docs.goto(base + '/api/docs/');
  await docs.getByRole('heading', { name: /Proyecto Final/ }).waitFor();
  cases.push('Swagger UI carga el contrato en el navegador.');
  await writeFile(new URL('navegador.json', output), JSON.stringify({ browser: browser.version(), base, cases }, null, 2));
  console.table(cases);
} finally {
  await browser.close();
}

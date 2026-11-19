import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const runtime = process.env.PROJECT_NODE_MODULES;
if (!runtime) throw Error('Configura PROJECT_NODE_MODULES con la carpeta del runtime de presentaciones.');
const { Presentation, PresentationFile } = await import(pathToFileURL(path.join(runtime, '@oai/artifact-tool/dist/artifact_tool.mjs')).href);

async function read(name) {
  try { return JSON.parse(await fs.readFile('evidencias/' + name + '.json', 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

const acceptance = await read('aceptacion');
const load = await read('load');
const stress = await read('stress');
const passed = acceptance?.cases?.filter(item => item.pass).length;
const ms = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const evidence = load && stress
  ? [`Carga · ${load.maxVus} usuarios virtuales, p95 de ${ms.format(load.duration['p(95)'])} ms.`,
     `Estrés · hasta ${stress.maxVus} usuarios virtuales, p95 de ${ms.format(stress.duration['p(95)'])} ms.`,
     `Aceptación HTTP · ${passed ?? 0} de ${acceptance?.cases?.length ?? 0} casos aprobados.`]
  : ['Consulta el informe de calidad para verificar qué perfiles se ejecutaron.'];

const slides = [
  { title: 'Proyecto Final', sub: 'Mesa de soporte universitario multisede', lines: ['Proyecto final de Ingeniería de Software II'], notes: 'Presentar el MVP académico. Las sedes y cuentas de la demostración son sintéticas.' },
  { title: 'Soporte entre dos sedes', lines: ['El estudiante registra y sigue sus solicitudes.', 'El agente atiende la bandeja de su sede.', 'El historial reúne los cambios de estado del caso.'], notes: 'Explicar el problema de seguimiento cuando los reportes se reparten en varios canales. Mostrar los perfiles Central y Norte.' },
  { title: 'Arquitectura del entorno', lines: ['React y Nginx publican el portal y enrutan la API REST.', 'Node.js y Prisma consultan PostgreSQL.', 'Un worker independiente transforma eventos pendientes en notificaciones.'], notes: 'Abrir el C4 del documento de arquitectura. Distinguir llamadas REST síncronas de la cola persistida. La notificación eventual sigue disponible tras reiniciar el worker. Fuente del modelo: https://c4model.com' },
  { title: 'Transiciones y concurrencia', lines: ['Abierta, En curso, Resuelta.', 'La API confirma el nuevo estado y su evento en una sola transacción.', 'El worker confirma la notificación y marca el evento en otra transacción.'], notes: 'Una actualización condicional evita confirmar dos veces el mismo cambio. El índice único de eventId protege contra duplicados. Señalar los límites de una base de datos compartida.' },
  { title: 'Asistente universitario', lines: ['El portal consulta temas de matrícula, acceso digital y seguimiento.', 'OpenRouter se activa desde el .env del servidor.', 'La guía local responde durante una falla del proveedor.'], image: '02-estudiante.png', notes: 'Demostrar una sugerencia en el chat y señalar el origen de la respuesta. El proveedor recibe el mensaje del usuario. La defensa puede realizarse con FAQ. Documentación: https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion' },
  { title: 'Pruebas de calidad', lines: evidence, notes: 'Explicar que k6 mide la lista autenticada en la red Compose. El gráfico y las muestras están en el informe y el JSON. Separar la revisión heurística de un estudio con usuarios. Referencia de umbrales: https://grafana.com/docs/k6/latest/using-k6/thresholds/' },
  { title: 'Demostración del ciclo', lines: ['Estudiante Central · crear una solicitud y consultar el chat.', 'Agente Central · iniciar atención y resolver.', 'Estudiante Central · actualizar el detalle y comprobar las notificaciones.'], image: '03-agente.png', notes: 'Abrir http://localhost:8097. Usar perfiles demo. Si la notificación aún no aparece, esperar el sondeo y pulsar Actualizar. Mostrar Swagger si hay preguntas sobre los contratos.' },
  { title: 'Disponibilidad y próximos pasos', lines: ['El entorno de pruebas funciona en un host con Docker Compose.', 'La instalación redundante requiere balanceo y PostgreSQL con failover.', 'Validar recuperación y repetir pruebas en la topología institucional.'], notes: 'Reconocer el punto único de fallo del ambiente local. Explicar TLS, secretos, límites compartidos, monitoreo y respaldo probado.' },
];

const p = Presentation.create({ slideSize: { width: 1280, height: 720 } });
const previews = 'tmp/pdfs';
await fs.mkdir(previews, { recursive: true });
await fs.mkdir('output', { recursive: true });

function text(slide, value, left, top, width, height, size, color, bold = false) {
  const shape = slide.shapes.add({ geometry: 'textbox', position: { left, top, width, height },
    fill: 'none', line: { fill: 'none', width: 0 } });
  shape.text = value;
  shape.text.style = { fontFamily: 'Arial', fontSize: size, color, bold, verticalAlignment: 'middle',
    insets: { left: 0, right: 0, top: 0, bottom: 0 } };
}

for (const [index, info] of slides.entries()) {
  const slide = p.slides.add();
  const cover = index === 0;
  slide.background.fill = cover ? '#173D31' : '#F5F5EF';
  const ink = cover ? '#FFFFFF' : '#19332B';
  const muted = cover ? '#D5E8DC' : '#415E51';
  let image = null;
  if (info.image) image = await fs.readFile('evidencias/' + info.image).catch(() => null);
  if (cover) {
    text(slide, info.title, 80, 170, 1100, 135, '88pt', ink, true);
    text(slide, info.sub, 84, 321, 1080, 62, '32pt', ink);
    text(slide, info.lines[0], 86, 428, 1050, 40, '18pt', muted);
  } else {
    text(slide, info.title, 72, 71, 1136, 88, '40pt', ink, true);
    info.lines.forEach((line, i) => text(slide, line, 74, 209 + i * 108,
      image ? 465 : 1098, image ? 93 : 68, image ? '20pt' : '27pt', ink));
    if (image) slide.images.add({
      blob: image.buffer.slice(image.byteOffset, image.byteOffset + image.byteLength),
      contentType: 'image/png', alt: 'Captura del portal Proyecto Final', fit: 'contain',
      position: { left: 560, top: 206, width: 645, height: 371 },
    });
    text(slide, 'Proyecto Final  /  Ingeniería de Software II', 74, 644, 700, 30, '13pt', muted);
    text(slide, String(index + 1).padStart(2, '0'), 1150, 644, 48, 30, '13pt', muted);
  }
  slide.speakerNotes.text = info.notes;
  const preview = await p.export({ slide, format: 'png', scale: 1 });
  await fs.writeFile(path.join(previews, `defensa-${index+1}.png`), new Uint8Array(await preview.arrayBuffer()));
}

await (await PresentationFile.exportPptx(p)).save(path.join(previews, 'defensa-borrador.pptx'));
await fs.writeFile(path.join(previews, 'defensa.json'), JSON.stringify(slides));

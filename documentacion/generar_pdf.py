"""Genera los manuales, la especificación y el informe con la evidencia disponible."""
import json
import math
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.graphics.shapes import Drawing, Line, Polygon, Rect, String
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Image, PageBreak, Paragraph, Preformatted, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'pdf'
EVIDENCE = ROOT / 'evidencias'
OUT.mkdir(parents=True, exist_ok=True)
GREEN = colors.HexColor('#1D5040')
INK = colors.HexColor('#19332B')
MUTED = colors.HexColor('#4A6258')
PALE = colors.HexColor('#EAF1EA')
LINE = colors.HexColor('#CBD8CE')
WHITE = colors.white
WIDTH = 483

STYLE = {
    'title': ParagraphStyle('title', fontName='Helvetica-Bold', fontSize=29, leading=32, textColor=INK, spaceAfter=13),
    'section': ParagraphStyle('section', fontName='Helvetica-Bold', fontSize=14, leading=17, textColor=GREEN, spaceBefore=11, spaceAfter=5),
    'body': ParagraphStyle('body', fontName='Helvetica', fontSize=10.5, leading=15, textColor=INK, spaceAfter=7),
    'lead': ParagraphStyle('lead', fontName='Helvetica', fontSize=13, leading=18, textColor=MUTED, spaceAfter=16),
    'caption': ParagraphStyle('caption', fontName='Helvetica', fontSize=9, leading=12, textColor=MUTED, spaceAfter=8, spaceBefore=5),
    'cell': ParagraphStyle('cell', fontName='Helvetica', fontSize=9.5, leading=12, textColor=INK),
    'th': ParagraphStyle('th', fontName='Helvetica-Bold', fontSize=9.5, leading=12, textColor=WHITE),
    'code': ParagraphStyle('code', fontName='Courier', fontSize=8.4, leading=12, textColor=GREEN, leftIndent=10, spaceAfter=8),
}


def p(text, style='body'):
    return Paragraph(text, STYLE[style])


def h(text):
    return p(text, 'section')


def c(text):
    return Preformatted(text, STYLE['code'])


def title(name, description):
    return [p(name, 'title'), p(description, 'lead')]


def tbl(header, data, widths):
    table = Table(
        [[p(escape(str(value)), 'th') for value in header]] +
        [[p(escape(str(value)), 'cell') for value in row] for row in data],
        colWidths=widths, repeatRows=1, hAlign='LEFT',
    )
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), GREEN),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [PALE, WHITE]),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW', (0, -1), (-1, -1), .5, LINE),
    ]))
    return table


def write(name, label, items):
    def decorate(canvas, doc):
        w, page_h = A4
        canvas.setFillColor(INK)
        canvas.rect(0, page_h - 48, w, 48, fill=1, stroke=0)
        canvas.setFillColor(WHITE)
        canvas.setFont('Helvetica-Bold', 11)
        canvas.drawString(50, page_h - 30, 'Proyecto Final')
        canvas.setFont('Helvetica', 9)
        canvas.drawRightString(w - 50, page_h - 30, label)
        canvas.setStrokeColor(LINE)
        canvas.line(50, 48, w-50, 48)
        canvas.setFillColor(MUTED)
        canvas.drawString(50, 33, 'Ingeniería de Software II  /  Proyecto integrador')
        canvas.drawRightString(w-50, 33, str(doc.page))

    doc = SimpleDocTemplate(str(OUT / name), pagesize=A4, topMargin=72, bottomMargin=62,
                            leftMargin=50, rightMargin=50, title=label, author='Proyecto académico Proyecto Final')
    doc.build(items, onFirstPage=decorate, onLaterPages=decorate)


def box(d, x, y, w, label, note, dark=False):
    d.add(Rect(x, y, w, 43, rx=6, ry=6, fillColor=GREEN if dark else PALE, strokeColor=LINE))
    d.add(String(x+w/2, y+26, label, fontName='Helvetica-Bold', fontSize=11,
                 fillColor=WHITE if dark else INK, textAnchor='middle'))
    d.add(String(x+w/2, y+11, note, fontName='Helvetica', fontSize=8,
                 fillColor=WHITE if dark else MUTED, textAnchor='middle'))


def arrow(d, x1, y1, x2, y2, label=None, tx=None, ty=None, async_flow=False):
    d.add(Line(x1, y1, x2, y2, strokeColor=GREEN, strokeWidth=1.1, strokeDashArray=[4, 3] if async_flow else None))
    a = math.atan2(y2-y1, x2-x1)
    tip = [x2,y2, x2-7*math.cos(a-.4),y2-7*math.sin(a-.4), x2-7*math.cos(a+.4),y2-7*math.sin(a+.4)]
    d.add(Polygon(tip, fillColor=GREEN, strokeColor=None))
    if label:
        d.add(String(tx, ty, label, fontName='Helvetica', fontSize=8, fillColor=MUTED, textAnchor='middle'))


def context():
    d = Drawing(WIDTH, 174)
    box(d, 14, 125, 162, 'Estudiante', 'Persona · sedes Central y Norte')
    box(d, 306, 125, 162, 'Agente', 'Persona · restringido a su sede')
    box(d, 160, 68, 162, 'Proyecto Final', 'Sistema · soporte universitario', True)
    box(d, 160, 0, 162, 'OpenRouter', 'Sistema externo · IA opcional')
    arrow(d, 95, 125, 160, 101, 'Crea y consulta', 95, 105)
    arrow(d, 387, 125, 322, 101, 'Atiende casos', 391, 105)
    arrow(d, 241, 68, 241, 43, 'Consulta FAQ asistida', 297, 53)
    return d


def containers():
    d = Drawing(WIDTH, 220)
    box(d, 10, 161, 145, 'Portal web', 'React / Nginx · contenedor')
    box(d, 175, 161, 145, 'API', 'Node.js / Express · contenedor', True)
    box(d, 339, 161, 140, 'OpenRouter', 'Externo · opcional')
    box(d, 175, 76, 145, 'PostgreSQL', 'Datos, outbox y notificaciones')
    box(d, 175, 0, 145, 'Worker', 'Node.js · contenedor')
    arrow(d, 155, 183, 175, 183, 'REST', 165, 199)
    arrow(d, 320, 183, 339, 183, 'HTTPS', 330, 199)
    arrow(d, 247, 161, 247, 119, 'SQL vía Prisma', 295, 138)
    arrow(d, 247, 43, 247, 76, 'Sondeo y escritura', 300, 55, True)
    d.add(String(10, 149, 'Usuario / navegador / Nginx', fontName='Helvetica', fontSize=8, fillColor=MUTED))
    return d


def components():
    d = Drawing(WIDTH, 290)
    box(d, 174, 241, 136, 'Entrada HTTP', 'Express · Zod · JWT', True)
    box(d, 5, 154, 132, 'Identidad', 'Scrypt y perfil')
    box(d, 175, 154, 132, 'Solicitudes', 'Alcance y transición')
    box(d, 346, 154, 132, 'Asistente', 'Contexto FAQ')
    box(d, 175, 78, 132, 'Prisma Client', 'Consultas y transacción')
    box(d, 346, 78, 132, 'OpenRouter', 'Proveedor externo')
    box(d, 175, 3, 132, 'PostgreSQL', 'Fuera de la API')
    arrow(d, 201, 241, 89, 197, 'Login / perfil', 112, 223)
    arrow(d, 241, 241, 241, 197, 'Casos', 261, 215)
    arrow(d, 282, 241, 393, 197, 'Chat', 379, 223)
    arrow(d, 99, 154, 175, 107, 'Perfil', 132, 123)
    arrow(d, 241, 154, 241, 121, 'CRUD', 266, 135)
    arrow(d, 412, 154, 412, 121, 'HTTPS', 441, 135)
    arrow(d, 241, 78, 241, 46, 'SQL', 266, 59)
    return d


def event_model():
    d = Drawing(WIDTH, 137)
    box(d, 5, 89, 132, 'User', 'id · role · campus')
    box(d, 175, 89, 132, 'Ticket', 'ownerId · status')
    box(d, 346, 89, 132, 'OutboxEvent', 'ticketId · processedAt')
    box(d, 175, 8, 132, 'Notification', 'ticketId · eventId único', True)
    arrow(d, 137, 110, 175, 110, '1 : N', 156, 119)
    arrow(d, 241, 89, 241, 51, '1 : N', 261, 67)
    arrow(d, 381, 89, 307, 47, '1 : 0..1', 362, 62)
    return d


def screenshot(file, caption, maxw=475, maxh=320):
    path = EVIDENCE / file
    if not path.exists():
        return []
    img = Image(str(path))
    scale = min(maxw/img.imageWidth, maxh/img.imageHeight)
    img.drawWidth, img.drawHeight = img.imageWidth*scale, img.imageHeight*scale
    return [img, p(caption, 'caption')]


def evidence(name):
    path = EVIDENCE / (name + '.json')
    return json.loads(path.read_text(encoding='utf-8-sig')) if path.exists() else {}


write('01-arquitectura.pdf', 'Fase 1  /  Especificación de arquitectura', [
    *title('Especificación de arquitectura', 'Mesa de soporte universitario para las sedes Central y Norte. Versión 1.0.'),
    h('Problema y alcance'),
    p('Escenario académico de dos sedes con procesos de soporte equivalentes. Las solicitudes dispersas dificultan consultar el avance y el historial de atención. Proyecto Final ofrece un formulario, una bandeja por sede y orientación de primer nivel. Se emplean personas y datos de demostración.'),
    tbl(['ID', 'Requisito funcional', 'Criterio de aceptación'], [
        ('RF-01', 'Autenticar estudiante y agente', 'Credencial válida entrega JWT y perfil. La sesión caduca en 1 h.'),
        ('RF-02', 'Crear y consultar solicitudes', 'Estudiante ve sus casos. Agente consulta los de su sede.'),
        ('RF-03', 'Gestionar el ciclo de atención', 'Abierta, En curso y Resuelta. Solo agente autorizado puede avanzar.'),
        ('RF-04', 'Mostrar notificaciones', 'Cada transición confirmada genera una notificación visible en el detalle.'),
        ('RF-05', 'Orientar sobre temas frecuentes', 'El chat indica su fuente y dispone de respaldo FAQ.'),
    ], [63, 153, 267]),
    h('Atributos de calidad'),
    p('<b>Q-01 Rendimiento.</b> En lectura autenticada, carga de 20 usuarios virtuales con p95 &lt; 400 ms y errores &lt; 1 %. Estrés hasta 100 con p95 &lt; 1.000 ms y errores &lt; 5 %.'),
    p('<b>Q-02 Seguridad.</b> Comprobar autorización por objeto, rol y sede, validación de entradas y autenticación obligatoria.'),
    p('<b>Q-03 Continuidad.</b> Persistir las transiciones pendientes ante caída del worker y mantener disponible el FAQ ante falla de OpenRouter.'),
    p('<b>Q-04 Usabilidad.</b> Verificar creación, seguimiento y chat. Revisar teclado y diseño móvil.'),
    h('Límites del MVP'),
    p('El sistema cubre soporte y seguimiento, con notificaciones dentro del portal. Identidad institucional, correo saliente y gestión administrativa de cuentas requieren integración posterior.'),
    PageBreak(), *title('Contexto y contenedores', 'Vistas C4 del entorno y de las unidades que se ejecutan por separado.'),
    h('C4 nivel 1 · Contexto'), context(),
    p('Figura 1. Los actores de ambas sedes entran por la misma aplicación. OpenRouter recibe la pregunta cuando la integración está activa.', 'caption'),
    h('C4 nivel 2 · Contenedores'), containers(),
    p('Figura 2. Las líneas continuas representan llamadas síncronas. El trazo discontinuo representa el procesamiento diferido de la cola persistida en PostgreSQL. Compose ejecuta la migración antes del arranque de API y worker.', 'caption'),
    PageBreak(), *title('Componentes y modelo de datos', 'Vista C4 de la API y relaciones persistidas por Prisma.'),
    h('C4 nivel 3 · Componentes de la API'), components(),
    p('Figura 3. La entrada HTTP autentica y valida las operaciones. Las rutas de solicitudes e identidad usan Prisma. La integración conversacional se comunica con un sistema externo.', 'caption'),
    h('Modelo relacional'), event_model(),
    p('Figura 4. Las flechas muestran relaciones con clave foránea. El ID de la solicitud también viaja en el evento de salida. La API y el worker coordinan su escritura mediante PostgreSQL.', 'caption'),
    PageBreak(), *title('Reglas de persistencia', 'Responsabilidades de componentes y decisiones transaccionales.'),
    tbl(['Componente', 'Responsabilidad y dependencia'], [
        ('HTTP y validación', 'Express procesa JSON, limita tamaño y valida esquemas con Zod. Usa autenticación para rutas privadas.'),
        ('Identidad y autorización', 'Scrypt compara credenciales. JWT HS256 identifica al usuario. Prisma consulta rol y sede vigentes.'),
        ('Solicitudes', 'Aplica reglas de alcance y transición. Escribe Ticket y OutboxEvent en una transacción.'),
        ('Asistente', 'Consulta OpenRouter vía HTTPS con un límite de 8 s y conserva la guía FAQ como alternativa local.'),
        ('Prisma Client', 'Mapea modelos y ejecuta consultas de PostgreSQL. El worker usa una consulta parametrizada para reservar eventos.'),
        ('Procesador asíncrono', 'Proceso separado. Selecciona una fila pendiente con FOR UPDATE SKIP LOCKED y confirma notificación y procesamiento juntos.'),
    ], [148, 335]),
    h('Modelo de datos'),
    tbl(['Relación', 'Integridad'], [
        ('User 1:N Ticket', 'ownerId vincula el caso a su propietario. La sede del caso se toma del perfil al crearlo.'),
        ('Ticket 1:N Notification', 'Las notificaciones pertenecen al caso y heredan su control de acceso al consultarse.'),
        ('OutboxEvent 1:0..1 Notification', 'eventId único impide duplicados. El worker marca processedAt al confirmar.'),
    ], [185, 298]),
    h('Consistencia y concurrencia'),
    p('La transición compara el estado anterior durante la escritura, de modo que dos solicitudes concurrentes no pueden confirmar la misma transición. La bandeja de salida transaccional mantiene el evento si el worker se interrumpe después de confirmar el cambio. El usuario puede actualizar el detalle para ver las notificaciones.'),
    h('Índices'),
    p('La API lista por propietario o sede y ordena por fecha. El worker busca por processedAt y createdAt. El detalle busca notificaciones por ticketId y fecha.'),
    PageBreak(), *title('Disponibilidad y decisiones', 'Comportamiento ante fallas y evolución de la topología.'),
    tbl(['Decisión', 'Beneficio y costo'], [
        ('REST para operaciones del portal', 'El usuario recibe confirmación inmediata. La API y la base de datos deben estar disponibles para registrar cambios.'),
        ('Outbox persistente sobre PostgreSQL', 'La transición y el evento se confirman juntos. El sondeo introduce latencia y añade carga a la base.'),
        ('FAQ local con OpenRouter opcional', 'La orientación permanece accesible durante falla externa. El proveedor aporta lenguaje natural y requiere una clave con cuota.'),
        ('JWT y autorización vigente en BD', 'El backend no necesita almacenar sesiones. Consultar el perfil en cada solicitud añade una lectura.'),
    ], [175, 308]),
    h('Fallos y recuperación'),
    tbl(['Fallo', 'Efecto en el entorno de pruebas', 'Siguiente paso'], [
        ('Worker detenido', 'El portal sigue registrando transiciones. Se acumulan eventos.', 'Reiniciar y verificar drenaje.'),
        ('OpenRouter no responde', 'El asistente entrega la respuesta FAQ.', 'Revisar modelo, cuota y conectividad.'),
        ('API reinicia', 'La salud consulta PostgreSQL. Nginx vuelve a resolver el servicio.', 'Medir interrupción y escalonar réplicas.'),
        ('PostgreSQL / host caído', 'Se interrumpe el núcleo. Volumen local en un único host.', 'Replicación multi-zona y recuperación ensayada.'),
    ], [95, 218, 170]),
    h('Topología para alta disponibilidad'),
    p('Diseño objetivo: balanceador TLS, dos o más réplicas de API y frontend en hosts distintos, dos workers y PostgreSQL administrado con failover y copias verificadas. Incorporar un almacén compartido para límites de tráfico y ejecutar las migraciones como tarea previa. Supervisar p95, errores, salud y antigüedad del evento pendiente más antiguo.'),
    p('La instalación de pruebas usa una sola instancia de PostgreSQL y un solo host. La conmutación multi-zona y los objetivos de recuperación requieren ejecución y medición en esa topología.'),
    h('Referencias'),
    p('Modelo C4 · https://c4model.com<br/>Guía de Prisma en Docker · https://docs.prisma.io/docs/guides/deployment/docker', 'caption'),
])

write('05-manual-tecnico.pdf', 'Fase 5  /  Manual técnico', [
    *title('Manual técnico', 'Instalación, configuración y operación en el entorno de pruebas local.'),
    h('1. Requisitos e instalación'),
    p('Docker Desktop con motor Linux y Docker Compose v2. El primer arranque descarga imágenes y dependencias. Node.js 22 o posterior permite ejecutar la suite de aceptación desde el host. El puerto local de la entrega es 8097.'),
    c('docker compose up --build -d --wait\n' + 'docker compose ps -a'),
    p('En una copia nueva, crea previamente .env con <font face="Courier">Copy-Item .env.example .env</font>. El archivo de esta entrega ya existe. Ejecuta los comandos desde la raíz del proyecto.'),
    tbl(['Servicio', 'Función y punto de comprobación'], [
        ('frontend', 'React compilado y servido por Nginx en http://localhost:8097.'),
        ('api', 'Node.js y Express. Salud en /api/health y Swagger en /api/docs/.'),
        ('db', 'PostgreSQL 16. Volumen persistente postgres dentro del proyecto Compose.'),
        ('migrate', 'Aplica migración y semilla opcional. Sale con código 0 al finalizar.'),
        ('worker', 'Procesa eventos pendientes y genera notificaciones.'),
    ], [120, 363]),
    h('2. Variables del archivo .env'),
    tbl(['Variable', 'Uso'], [
        ('POSTGRES_PASSWORD', 'Contraseña local. Elige caracteres seguros para URL o codifica el valor al construir DATABASE_URL.'),
        ('JWT_SECRET', 'Cadena de al menos 32 caracteres. Cambiarla invalida sesiones previas.'),
        ('DEMO_SEED', 'true crea cuatro cuentas sintéticas si faltan. false omite la creación.'),
        ('APP_PORT', 'Puerto en loopback. Usa otro si 8097 está ocupado.'),
        ('OPENROUTER_API_KEY', 'Vacía de fábrica. Una clave válida activa la consulta a OpenRouter.'),
        ('OPENROUTER_MODEL', 'Modelo enviado al proveedor. Valor inicial openrouter/auto.'),
    ], [164, 319]),
    p('Después de configurar el chat, aplica el entorno actualizado con <font face="Courier">docker compose up -d --wait api</font>. Verifica el origen de una respuesta desde el portal. La API devuelve <font face="Courier">faq</font> o <font face="Courier">openrouter</font>.'),
    PageBreak(), *title('Operación y diagnóstico', 'Comprobaciones de rutina y preservación de datos.'),
    h('3. Validación de servicios'),
    c('Invoke-RestMethod http://localhost:8097/api/health\n' + 'docker compose logs --tail 60 migrate api worker frontend\n' + 'node --test backend/src/chat.test.js\n' + 'node pruebas/aceptacion.mjs\n' + '& ./pruebas/replicas.ps1'),
    p('El endpoint de salud debe devolver {"status":"ok"}. La suite usa la semilla local y graba JSON en evidencias/. Si cambias APP_PORT, ajusta BASE_URL para las pruebas ejecutadas en el host.'),
    tbl(['Síntoma', 'Diagnóstico'], [
        ('Puerto ocupado', 'Ajusta APP_PORT y vuelve a ejecutar docker compose up -d --wait.'),
        ('API pendiente', 'Confirma salud de db y código de salida de migrate. Revisa las credenciales y JWT_SECRET.'),
        ('Notificación pendiente', 'Revisa logs del worker, reinícialo y actualiza el detalle tras unos segundos.'),
        ('Chat responde con FAQ', 'Comprueba clave, modelo, conectividad y cuota. El respaldo se usa tras error o demora.'),
        ('Docker inaccesible', 'Abre Docker Desktop y confirma que el motor de contenedores Linux está listo.'),
    ], [150, 333]),
    h('4. Copia lógica'),
    p('Este ejemplo guarda la copia dentro del contenedor con pg_dump y luego la copia al host. Prueba cada restauración en una base de ensayo y verifica cuentas, solicitudes e historial.'),
    c('docker compose exec -T db pg_dump -U lamilla -Fc -f /tmp/lamilla.dump lamilla\n' +
      'docker compose cp db:/tmp/lamilla.dump ./lamilla.dump\n' +
      'docker compose stop'),
    p('docker compose stop conserva el volumen. El borrado del volumen elimina los datos de la base. Protege las copias y configura una política de retención para un entorno institucional.'),
    h('5. Preparación de un ambiente institucional'),
    p('Usa TLS, secretos administrados y cuentas individuales, desactiva la semilla demo y aprovisiona identidades institucionales. Define replicación multi-zona, copias fuera del host, límites de tráfico compartidos y alertas de latencia, error y atraso de cola. Ejecuta nuevamente aceptación, carga y recuperación antes de habilitar acceso general.'),
    PageBreak(), *title('Recorrido por el código', 'Puntos de entrada para la sustentación y el mantenimiento.'),
    tbl(['Ruta', 'Contenido'], [
        ('frontend/src/main.jsx', 'Inicio de sesión, bandejas, formulario, detalle y asistente. La sesión se guarda en memoria.'),
        ('frontend/nginx.conf', 'Publicación de estáticos y proxy del mismo origen /api/.'),
        ('backend/src/server.js', 'Rutas, JWT, validación, límites y Swagger UI.'),
        ('backend/src/tickets.js', 'Consultas acotadas por usuario o sede y transición transaccional.'),
        ('backend/src/chat.js', 'Temas FAQ y llamada al servicio externo.'),
        ('backend/src/worker.js', 'Extracción de eventos, confirmación y reintento.'),
        ('backend/prisma/', 'Esquema relacional y migración SQL versionada.'),
        ('backend/src/openapi.json', 'Contrato OpenAPI 3.0.3 y autenticación bearer.'),
        ('pruebas/', 'Pruebas de aceptación, navegador y perfiles de k6.'),
    ], [192, 291]),
    h('Actualizar el esquema'),
    p('Genera una migración nueva contra una base de desarrollo aislada, revisa su SQL y versiona el directorio. Usa <font face="Courier">prisma migrate deploy</font> para aplicar migraciones pendientes en el ambiente de pruebas. El servicio migrate de Compose ejecuta ese paso.'),
    h('Prueba de carga y estrés en PowerShell'),
    c('docker compose run --rm k6\n' +
      "$env:LOAD_PROFILE = 'stress'\n" +
      'docker compose run --rm k6\n' +
      'Remove-Item Env:LOAD_PROFILE'),
    p('El ejecutor k6 se conecta al frontend dentro de la red Compose. Cada perfil genera un JSON separado. Consulta el informe de calidad para conocer la carga aplicada y sus límites.'),
    h('Referencias'),
    p('Prisma Migrate · https://docs.prisma.io/docs/cli/migrate/deploy<br/>OpenRouter · https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion', 'caption'),
])

write('06-manual-usuario.pdf', 'Fase 5  /  Manual de usuario', [
    *title('Manual de usuario', 'Solicitudes y orientación para estudiantes y agentes de soporte.'),
    h('1. Iniciar sesión'),
    p('Abre <link href="http://localhost:8097" color="#1D5040">http://localhost:8097</link> en el navegador. Introduce el correo y la contraseña del perfil que quieras demostrar. En la cabecera verás tu nombre, rol y sede.'),
    tbl(['Perfil de demostración', 'Correo'], [
        ('Estudiante Central', 'estudiante@lamilla.test'),
        ('Agente Central', 'agente@lamilla.test'),
        ('Estudiante Norte', 'norte@lamilla.test'),
        ('Agente Norte', 'agente.norte@lamilla.test'),
    ], [187, 296]),
    p('Todas las cuentas de demostración usan <b>LamillaDemo2026!</b>. Si aparece un error, revisa el correo y la contraseña. Usa <b>Cerrar sesión</b> para cambiar de perfil. Al recargar la página se requiere iniciar sesión de nuevo.'),
    *screenshot('01-inicio.png', 'Figura 1. Pantalla de entrada del entorno de pruebas.', maxh=280),
    PageBreak(), *title('Estudiante', 'Crear solicitudes, seguir un caso y consultar el asistente.'),
    h('2. Registrar una solicitud'),
    p('En <b>Mis solicitudes</b>, elige <b>Nueva solicitud</b>. Escribe un asunto de al menos cinco caracteres, selecciona una categoría y describe el problema en al menos diez caracteres. Selecciona <b>Enviar solicitud</b>. El detalle muestra el estado <b>Abierta</b>.'),
    h('3. Consultar el avance'),
    p('Selecciona un caso en la lista. Usa el filtro de estado cuando tengas varias solicitudes. El detalle muestra la descripción, el estado y las notificaciones. Selecciona <b>Actualizar</b> en Notificaciones para cargar los cambios confirmados recientemente.'),
    h('4. Usar el asistente'),
    p('Selecciona una pregunta sugerida o escribe la tuya y pulsa <b>Enviar pregunta</b>. Puedes preguntar por contraseña, matrícula, sedes y seguimiento. La respuesta se identifica como <b>Guía de Proyecto Final</b> o <b>Respuesta de IA</b>. Evita compartir contraseñas y datos personales.'),
    *screenshot('02-estudiante.png', 'Figura 2. Detalle de un caso de demostración y respuesta del asistente.', maxh=280),
    PageBreak(), *title('Agente de soporte', 'Atención de solicitudes dentro de tu sede.'),
    h('5. Gestionar un caso'),
    p('En la <b>Bandeja de atención</b>, abre una solicitud de tu sede. Selecciona <b>Iniciar atención</b> para moverla a <b>En curso</b>. Una vez atendida, selecciona <b>Marcar como resuelta</b>. El estudiante podrá consultar la notificación después de que el sistema la procese.'),
    tbl(['Estado', 'Qué significa'], [
        ('Abierta', 'El sistema recibió la solicitud y está disponible en la bandeja.'),
        ('En curso', 'Un agente inició la atención.'),
        ('Resuelta', 'El agente completó el tratamiento del caso.'),
    ], [142, 341]),
    *screenshot('03-agente.png', 'Figura 3. Vista de agente al cerrar un caso.', maxh=280),
    h('6. Si una acción falla'),
    p('Si caduca tu sesión, vuelve a entrar. Si otro agente adelantó el caso, pulsa Actualizar en el detalle antes de reintentar. El portal muestra solicitudes autorizadas para el perfil con el que iniciaste sesión.'),
])

acceptance = evidence('aceptacion').get('cases', [])
browser = evidence('navegador')
recovery = evidence('recuperacion')
replicas = evidence('replicas')
load_runs = [item for item in (evidence('load'), evidence('stress')) if item.get('duration')]


def decimal(value, places=2):
    return f'{value:.{places}f}'.replace('.', ',')


def chart(runs):
    d = Drawing(WIDTH, 192)
    if not runs:
        d.add(String(12, 110, 'No hay resultados de k6 disponibles.', fillColor=MUTED, fontSize=11))
        return d
    chart_width = 323
    max_value = max(item['duration']['p(99)'] for item in runs)
    step = max(1, math.ceil(max_value / 5))
    top = step * 5
    for mark in range(6):
        x = 112 + chart_width * mark / 5
        d.add(Line(x, 33, x, 155, strokeColor=LINE))
        d.add(String(x, 17, str(mark*step), textAnchor='middle', fontSize=8, fillColor=MUTED))
    d.add(String(469, 17, 'ms', textAnchor='end', fontSize=8, fillColor=MUTED))
    for index, item in enumerate(runs):
        y = 129 - index*66
        label = 'Carga' if item['profile'] == 'load' else 'Estrés'
        d.add(String(9, y-3, label, fontName='Helvetica-Bold', fontSize=10, fillColor=INK))
        for metric, offset, color in [('med', 7, colors.HexColor('#ABC8B5')), ('p(95)', -8, GREEN), ('p(99)', -23, colors.HexColor('#B06B3D'))]:
            value = item['duration'][metric]
            width = chart_width * value/top
            d.add(Rect(112, y+offset, width, 11, fillColor=color, strokeColor=None))
            d.add(String(116+width, y+offset+2, decimal(value), fontSize=8, fillColor=INK))
    for i, (label, color) in enumerate([('p50', '#ABC8B5'), ('p95', '#1D5040'), ('p99', '#B06B3D')]):
        d.add(Rect(112+i*82, 173, 13, 9, fillColor=colors.HexColor(color), strokeColor=None))
        d.add(String(130+i*82, 173, label, fontSize=9, fillColor=INK))
    return d


rows = []
for item in load_runs:
    duration = item['duration']
    rows.append((
        'Carga' if item['profile'] == 'load' else 'Estrés',
        item['maxVus'], item['samples'], decimal(duration['avg']), decimal(duration['p(95)']),
        decimal(duration['max']), decimal(item['errorRate']*100) + ' %',
        'Cumple' if all(result['ok'] for result in item['thresholds'].values()) else 'Incumple'
    ))
passed = sum(case['pass'] for case in acceptance)
write('04-calidad.pdf', 'Fase 4  /  Informe de calidad', [
    *title('Informe de calidad', 'Rendimiento, controles de seguridad, usabilidad y aceptación del MVP.'),
    h('Entorno y metodología'),
    p('Ejecución del 17 de noviembre de 2026 en un equipo Windows con Docker Desktop, red Compose y datos sintéticos. k6 1.0.0 solicita GET /api/tickets?page=1 con un JWT de agente. Cada usuario virtual espera 200 ms entre iteraciones.'),
    p('Carga: rampa de 5 s hasta 20 usuarios, 15 s sostenidos y 5 s de descenso. Estrés: 5 s hasta 30, 8 s hasta 100, 10 s sostenidos y 5 s de descenso. Los umbrales p95 son 400 y 1.000 ms, con errores por debajo de 1 % y 5 %, respectivamente. Ambas pruebas exigen más del 99 % de verificaciones HTTP 200.'),
    tbl(['Perfil', 'VU', 'Muestras', 'Media ms', 'p95 ms', 'Máx. ms', 'Error', 'Umbral'], rows,
        [60, 33, 67, 66, 58, 63, 59, 77]),
    Spacer(1, 12), chart(load_runs),
    p('Figura 1. Percentiles de latencia del listado autenticado. p95 indica el latencia que el 95 % de las muestras no superó.', 'caption'),
    h('Interpretación y alcance'),
    p('Estos resultados describen la lectura autenticada con un conjunto pequeño de casos. API, base y generador compartieron host. El perfil de estrés comprueba un pico de 100 usuarios virtuales. Para localizar el primer punto de saturación, instrumentar API, pool de Prisma y PostgreSQL, y repetir con rampas crecientes hasta observar degradación.'),
    p('Los perfiles excluyen el costo del proveedor conversacional, escrituras concurrentes sostenidas y latencia entre zonas. Los JSON registran muestras, tiempos y umbrales por perfil.'),
    PageBreak(), *title('Seguridad y mitigación', 'Verificación defensiva de controles basada en OWASP Top 10:2025.'),
    tbl(['Riesgo', 'Comprobación o control', 'Acción antes de abrir acceso'], [
        ('A01 Acceso', 'E2E verifica 401 sin sesión, 403 por rol y 404 para casos fuera de sede o propietario.', 'Alta · incluir controles en CI y probar baja de cuentas.'),
        ('A02 Configuración', 'Loopback y BD privada. Las credenciales de demostración son conocidas.', 'Alta · retirar cuentas sintéticas e instalar TLS.'),
        ('A03 Dependencias', 'npm audit sin alertas tras actualizar dependencias. npm ci usa archivos lock.', 'Alta · revisar avisos y escanear imágenes al publicar.'),
        ('A04 Criptografía', 'Scrypt con sal aleatoria, JWT HS256 y expiración de una hora.', 'Alta · administrar y rotar secretos. Cifrar copias.'),
        ('A05 Inyección', 'Validación de cuerpos y consultas parametrizadas por Prisma. React renderiza el chat como texto.', 'Media · mantener validaciones y revisar cambios en SQL.'),
        ('A06 Diseño', 'Matriz rol/sede, transiciones permitidas y límite para el chat.', 'Media · revisar abuso de cuota y minimización de datos.'),
        ('A07 Identidad', 'Login inválido devuelve un error genérico. Límite por IP.', 'Alta · integrar IdP, MFA para agentes y límites compartidos.'),
        ('A08 Integridad', 'Migración versionada. Transacción de notificación e índice único.', 'Media · firmar entregas y ensayar restauración.'),
        ('A09 Registro', 'Logs operativos de fallos internos sin cuerpo del chat.', 'Media · alertar sobre errores, rechazos y cola pendiente.'),
        ('A10 Excepciones', 'Errores controlados, límite de cuerpo y alternativa FAQ tras falla de proveedor.', 'Media · comprobar degradación con fallos de red y BD.'),
    ], [91, 222, 170]),
    p('Se actualizaron Vite, validación Zod y el limitador de solicitudes, además de dos dependencias transitivas de Prisma. Los informes npm-backend.json y npm-frontend.json registraron cero alertas en el árbol resuelto.'),
    p('El alcance combina revisión de código y comprobaciones funcionales. Una aceptación aprobada cubre los casos ejecutados. El despliegue multi-zona, la auditoría de imágenes y una revisión de seguridad institucional requieren evidencia adicional.'),
    p('Referencia · https://top10.owasp.org/2025/0x00_2025-Introduction/', 'caption'),
    PageBreak(), *title('Usabilidad y aceptación', 'Pruebas de extremo a extremo en Docker Compose y revisión heurística.'),
    h('Evaluación heurística'),
    tbl(['Criterio', 'Observación', 'Mejora'], [
        ('Visibilidad', 'Estado textual y confirmación de cambio. El usuario actualiza las notificaciones desde el detalle.', 'Actualizar automáticamente cuando la vista está abierta.'),
        ('Prevención de errores', 'Campos etiquetados y longitudes validadas. Solo aparece la siguiente acción válida.', 'Mostrar el error al lado del campo cuando responde la API.'),
        ('Reconocimiento', 'Botones con acción explícita y preguntas sugeridas.', 'Incluir una guía inicial para una bandeja vacía.'),
        ('Acceso y diseño móvil', 'Enlace de salto por teclado, foco visible y una columna en móvil.', 'Completar revisión con lector de pantalla y más tamaños.'),
    ], [105, 202, 176]),
    *screenshot('04-movil.png', 'Figura 2. Bandeja en navegador con un ancho de 390 píxeles.', maxh=300),
    p('La evaluación con participantes y medición de tiempos de tarea queda como extensión.'),
    PageBreak(), *title('Aceptación y recuperación', 'Resultados funcionales de HTTP, navegador y procesamiento diferido.'),
    h('Resultados de aceptación HTTP'),
    p(f'Se aprobaron {passed} de {len(acceptance)} casos. La suite recorre Nginx, API, base y worker.'),
    tbl(['Caso', 'Resultado', 'Tiempo ms'], [(case['name'], 'Aprobado' if case['pass'] else 'Falló', case['ms'])
        for case in acceptance], [331, 80, 72]),
    h('Comprobación en navegador'),
    p(f"Playwright registró {len(browser.get('cases', []))} comprobaciones en el navegador {browser.get('browser', 'pendiente')}. "
      'La revisión incluyó creación, chat, atención, teclado, móvil y Swagger. Las capturas están en evidencias/.'),
    h('Pruebas unitarias del asistente'),
    p('Tres comprobaciones cubren la orientación local, la degradación ante falla y la adaptación de una respuesta simulada de OpenRouter.'),
    h('Recuperación del trabajador'),
    p(f"Tras detener el worker, la API confirmó un cambio con cero notificaciones visibles. El worker recuperó exactamente una al arrancar. Se observó a los {recovery['observedAfterStartMs']} ms de iniciar el sondeo."
      if recovery.get('pass') else 'Ejecuta pruebas/recuperacion.ps1 para registrar la recuperación del evento al volver a iniciar el worker.'),
    h('Continuidad con dos réplicas de API'),
    p(f"El proxy completó {replicas['success']} de {replicas['total']} consultas de salud después de detener una de las dos réplicas de API. Compartían el mismo host, proxy y PostgreSQL."
      if replicas else 'Ejecuta pruebas/replicas.ps1 para medir la salud del portal después de detener una réplica de API.'),
    p('Referencia · https://grafana.com/docs/k6/latest/using-k6/thresholds/', 'caption'),
])


def defense_pdf():
    from reportlab.pdfgen import canvas
    from reportlab.lib.utils import ImageReader
    from reportlab.lib.styles import ParagraphStyle
    plan = ROOT / 'tmp' / 'pdfs' / 'defensa.json'
    if not plan.exists():
        return
    slide_width, slide_height = (960, 540)
    out = canvas.Canvas(str(OUT / '07-defensa.pdf'), pagesize=(slide_width, slide_height))
    out.setTitle('Proyecto Final · Sustentación final')
    for index, slide in enumerate(json.loads(plan.read_text(encoding='utf-8'))):
        is_cover = index == 0
        out.setFillColor(colors.HexColor('#173D31') if is_cover else colors.HexColor('#F5F5EF'))
        out.rect(0, 0, slide_width, slide_height, fill=1, stroke=0)
        out.setFillColor(WHITE if is_cover else INK)
        out.setFont('Helvetica-Bold', 76 if is_cover else 40)
        out.drawString(61, 320 if is_cover else 434, slide['title'])
        image_file = EVIDENCE / slide.get('image', '')
        has_image = image_file.is_file()
        if is_cover:
            out.setFont('Helvetica', 31)
            out.drawString(65, 253, slide['sub'])
            out.setFont('Helvetica', 17)
            out.drawString(66, 180, slide['lines'][0])
        else:
            body_size = 19 if has_image else 24
            area = 346 if has_image else 825
            for i, line in enumerate(slide['lines']):
                paragraph = Paragraph(escape(line), ParagraphStyle('slide', fontSize=body_size, leading=body_size*1.25, textColor=INK))
                _, height = paragraph.wrap(area, 86)
                assert height < 86
                paragraph.drawOn(out, 64, 352-i*86-height)
            if has_image:
                out.drawImage(ImageReader(str(image_file)), 426, 120, 472, 255, preserveAspectRatio=True, anchor='c')
            out.setFont('Helvetica', 10)
            out.setFillColor(MUTED)
            out.drawString(63, 46, 'Proyecto Final  /  Ingeniería de Software II')
            out.drawRightString(897, 46, f'{index+1:02d}')
        out.showPage()
    out.save()


defense_pdf()

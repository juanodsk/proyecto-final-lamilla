# Proyecto Final

Mesa de soporte universitario para las sedes Central y Norte. El estudiante registra solicitudes y consulta su seguimiento. El agente procesa los casos de su sede. Un trabajador independiente genera las notificaciones.

## Inicio rápido

Desde la raíz del proyecto, abre Docker Desktop en modo Linux y ejecuta:

```powershell
docker compose up --build -d --wait
```

El archivo `.env` local ya está preparado. En otro equipo copia `.env.example` a `.env`. Abre [Proyecto Final](http://localhost:8097) y [Swagger UI](http://localhost:8097/api/docs/).

| Perfil | Correo de demostración |
| --- | --- |
| Estudiante Central | estudiante@proyectofinal.test |
| Agente Central | agente@proyectofinal.test |
| Estudiante Norte | norte@proyectofinal.test |
| Agente Norte | agente.norte@proyectofinal.test |

Contraseña compartida: `LamillaDemo2026!`. Las cuentas son sintéticas y el puerto se publica solo en loopback. `DEMO_SEED=false` omite la carga inicial. En un volumen existente conserva las cuentas ya cargadas.

## Chatbot

Introduce tu clave en `OPENROUTER_API_KEY` dentro del `.env` raíz. El modelo se configura con `OPENROUTER_MODEL`. Aplica el cambio con `docker compose up -d --wait api`. El chat usa la guía local cuando la clave está vacía o el proveedor falla. La clave permanece en el servidor.

## Entregables de la consigna

| Fase | Entrega |
| --- | --- |
| 1. Arquitectura | [Especificación y diagramas C4](output/pdf/01-arquitectura.pdf) |
| 2. Núcleo | [API Node.js](backend/src/), [React](frontend/src/), [OpenAPI](backend/src/openapi.json), [Prisma y migraciones](backend/prisma/) |
| 3. Chatbot | [Motor FAQ e integración OpenRouter](backend/src/chat.js), componente Chat en React y manual de usuario |
| 4. Calidad | [Informe](output/pdf/04-calidad.pdf), [scripts](pruebas/) y [evidencias](evidencias/) |
| 5. Despliegue | [Compose](compose.yaml), [manual técnico](output/pdf/05-manual-tecnico.pdf), [manual de usuario](output/pdf/06-manual-usuario.pdf) y [defensa PDF](output/pdf/07-defensa.pdf) y [PowerPoint editable](output/07-defensa.pptx) |

## Reproducción

```powershell
node --test backend/src/chat.test.js
node pruebas/aceptacion.mjs
& ./pruebas/recuperacion.ps1
& ./pruebas/replicas.ps1
docker compose run --rm k6
$env:LOAD_PROFILE = 'stress'
docker compose run --rm k6
Remove-Item Env:LOAD_PROFILE
```

Para puertos distintos a 8097 cambia también `BASE_URL` al ejecutar aceptación desde el host. Los scripts de aceptación crean casos sintéticos. `docker compose stop` detiene los servicios y conserva los datos.

Las métricas aplican al entorno local y al flujo de lectura autenticada. El diseño y los pasos para una instalación redundante aparecen en la especificación y el manual técnico.

Para repetir la automatización de navegador instala Playwright con `npm install --no-save --no-package-lock playwright`, ejecuta `npx playwright install chromium` y después `node pruebas/navegador.mjs`. Opcionalmente define `BROWSER_PATH` si vas a usar el ejecutable de un navegador Chromium instalado.

Los manuales, la arquitectura y el informe de calidad se generan con `python documentacion/generar_pdf.py` y ReportLab. El informe incorpora la evidencia JSON disponible en la carpeta `evidencias/`.
La fuente de la sustentación está en `documentacion/defensa.mjs`. Para regenerar la versión PDF de la defensa, ejecuta ese archivo con el runtime de presentaciones indicado por `PROJECT_NODE_MODULES` y después vuelve a ejecutar el generador Python.

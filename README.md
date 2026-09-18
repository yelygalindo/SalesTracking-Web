# UrbanTrack CRM Web

Frontend independiente de UrbanTrack CRM, construido con React, TypeScript y Vite.

## Requisitos

- Node.js 22 LTS
- npm 10 o superior
- API `SalesTracking` en ejecución

## Inicio local

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Configura `VITE_API_BASE_URL` con el origen de la API, sin `/` al final. Por ejemplo:

```text
VITE_API_BASE_URL=https://api.example.com
```

La API debe admitir el origen `http://localhost:5173` en su configuración CORS.

## Estructura

```text
src/
  app/             # composición, providers y rutas protegidas
  features/        # funcionalidad agrupada por módulo
  components/      # componentes visuales compartidos
  lib/api/         # HTTP, errores y ciclo de vida de tokens
  config/          # variables de entorno validadas
  hooks/           # hooks compartidos
.github/workflows/ # CI y publicación de imagen
deploy/            # configuración del servidor web
```

## Autenticación

Las rutas públicas son `/login`, `/forgot-password` y `/reset-password?token=...`.
La sesión usa temporalmente `sessionStorage`, renueva tokens automáticamente y
carga el usuario y sus permisos desde `/api/auth/me`. El refresh token debe migrarse
a una cookie HttpOnly cuando la API ofrezca ese contrato.

El pipeline CI valida lint, pruebas y build. CD publica la imagen
`urbantrack-crm-web` en GitHub Container Registry; define la variable de repositorio
`VITE_API_BASE_URL` antes del primer despliegue.

## Pruebas y cobertura

```powershell
npm test
npm run test:coverage
npm run test:e2e
```

La cobertura usa Vitest con V8 y genera un resumen en consola, un reporte HTML en
`coverage/index.html` y un resumen JSON. CI aplica umbrales globales mínimos para
impedir que la cobertura existente disminuya. Estos umbrales deben incrementarse
progresivamente al incorporar pruebas de páginas y flujos completos.

Las pruebas E2E usan Playwright. Antes de ejecutarlas por primera vez instala
Chromium con `npx playwright install chromium`. El servidor web de pruebas se
inicia automáticamente y las llamadas críticas de autenticación se simulan para
que los escenarios de permisos sean deterministas.

## Publicación beta en Railway

Railway construye el `Dockerfile` raíz y valida `/health` antes de activar una versión.
Configura el servicio beta con `PORT=80` y `VITE_API_BASE_URL=https://api.urbantrack.io`.

En el environment `beta` de GitHub configura:

- Secret `RAILWAY_TOKEN`: Project Token del environment beta de Railway.
- Variable `RAILWAY_SERVICE`: nombre exacto del servicio web.
- Variable `RAILWAY_ENVIRONMENT`: nombre del environment, normalmente `production` o `beta`.
- Variable `RAILWAY_BETA_URL`: URL pública sin `/` final.

En variables generales del repositorio configura `VITE_API_BASE_URL`. Para publicar:

```powershell
git tag v0.1.0-beta.1
git push origin v0.1.0-beta.1
```

También puede ejecutarse manualmente el workflow `Release beta` desde GitHub Actions.

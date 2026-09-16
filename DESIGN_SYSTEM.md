# UrbanTrack Web Design System

## Dirección

CRM SaaS moderno para construcción y logística: limpio, profesional, enterprise,
minimalista, escaneable y orientado a acciones.

## Tokens

Los tokens canónicos viven en `src/presentation/styles/tokens.css`. No agregar colores
hexadecimales nuevos en componentes sin antes evaluar un token semántico existente.

- Sidebar: `#0F172A`
- Background: `#EEF2F7`
- Surface: `#FFFFFF`
- Surface soft: `#F8FAFC`
- Primary text: `#0F172A`
- Secondary text: `#64748B`
- Border: `#E2E8F0`
- Accent orange: `#F97316`
- Primary blue: `#2563EB`
- Success: `#10B981`
- Warning: `#F59E0B`
- Error: `#EF4444`

## Reglas UX

- El naranja es un acento, no una superficie grande de selección.
- La lectura se presenta como contenido; los inputs aparecen solo en modo edición.
- Cada pantalla cubre loading, empty, error y success.
- Estados vacíos explican qué ocurre y no reservan altura innecesaria.
- Fechas, horas y nombres deben conservar legibilidad sin cortes artificiales.
- Eventos internos se traducen a lenguaje comercial.
- Las acciones principales usan azul; naranja identifica contexto o énfasis.
- Listas extensas ofrecen búsqueda, filtros y paginación cuando corresponda.
- Todo cambio debe verificarse en escritorio y móvil.

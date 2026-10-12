# UrbanTrack Web Design System

## Dirección

CRM SaaS moderno para construcción y logística: limpio, profesional, enterprise,
minimalista, escaneable y orientado a acciones.

## Tokens

Los tokens canónicos viven en `src/presentation/styles/tokens.css`. No agregar colores
hexadecimales nuevos en componentes sin antes evaluar un token semántico existente.

- Sidebar: `#0F1B2E`
- Background: `#F4F6F9`
- Surface: `#FFFFFF` / Surface soft: `#F8FAFC`
- Texto principal: `#0F172A` / secundario: `#5B6475` / tenue: `#8A93A3`
- Borde: `#E2E7EE` / borde fuerte: `#CFD6E0`
- Acento de marca (indicadores, iconos activos): `#F97316`
- Primario de acción (botones, enlaces): `#CF4A0C`, hover `#B23F0A`. Cumple contraste AA con texto blanco.
- Info: `#2563EB` · Éxito: `#10B981` · Advertencia: `#F59E0B` · Error: `#EF4444` (cada uno con variante `-text` y `-soft`)

## Layout y navegación

- El shell vive en `src/components/layout`; la estructura del menú se define en `navigation.ts`
  agrupada por secciones (Operación, Comercial, Análisis, Configuración) y se filtra por permisos.
- La barra superior muestra la ubicación (sección › grupo › página) y el menú de perfil.
- Bajo 900px el menú lateral es un panel deslizable; se cierra con Escape, el fondo o al navegar.
- Estilos del shell: `shell.css`. Botones secundarios: clase `.secondary-button`.

## Reglas UX

- El naranja es un acento, no una superficie grande de selección.
- La lectura se presenta como contenido; los inputs aparecen solo en modo edición.
- Cada pantalla cubre loading, empty, error y success.
- Estados vacíos explican qué ocurre y no reservan altura innecesaria.
- Fechas, horas y nombres deben conservar legibilidad sin cortes artificiales.
- Eventos internos se traducen a lenguaje comercial.
- Las acciones principales usan el primario de acción; el acento naranja claro identifica contexto o énfasis.
- Listas extensas ofrecen búsqueda, filtros y paginación cuando corresponda.
- Todo cambio debe verificarse en escritorio y móvil.

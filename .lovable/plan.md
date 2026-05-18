# Plan

## 1. Background tarda mucho en cargar

Actualmente `useGlobalBackground` (en `src/lib/background.ts`) hace lo siguiente al entrar a la app:

1. Espera a que React monte.
2. Hace una consulta a Supabase (`app_settings`) para obtener la URL.
3. Solo después aplica `background-image` al `body`.
4. La imagen original se sirve sin optimizar desde Supabase Storage, así que puede pesar varios MB.

Eso provoca un "flash" sin fondo de 1–3 segundos al abrir.

### Cambios propuestos

- **Cachear la URL en `localStorage`**: al obtenerla, guardarla; al cargar la app, aplicarla inmediatamente (síncrono, antes del fetch) para que el fondo aparezca al instante. Luego el fetch real actualiza si cambió.
- **Precargar la imagen** con `<link rel="preload" as="image">` inyectado en cuanto se conozca la URL, para que el navegador la priorice.
- **Servir una versión optimizada** desde Supabase usando los parámetros de transform (`?width=1600&quality=70&format=webp`) — reduce el peso del fondo de varios MB a ~150–300 KB.
- **Mostrar un color/gradiente sólido de fondo** en `body` por defecto (en `src/styles.css`) para que nunca se vea "blanco" mientras carga la imagen.

## 2. Quitar la etiqueta "Edit with Lovable"

Esa etiqueta la inyecta Lovable automáticamente en sitios publicados. Se puede ocultar desde la configuración del proyecto (requiere plan Pro o superior).

Al aprobar este plan, ocultaré el badge usando la herramienta de publicación. Si tu plan actual no es Pro, te lo aviso y no se aplica el cambio.

## Archivos a tocar

- `src/lib/background.ts` — cache en localStorage, preload, URL optimizada.
- `src/styles.css` — color de fondo por defecto en `body`.
- Configuración de publicación — `hide_badge: true`.

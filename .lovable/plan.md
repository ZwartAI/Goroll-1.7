# Plan

## 1. Corrección UI móvil – botones "Unirme" fuera del recuadro

**Archivo:** `src/routes/index.tsx` (pantalla de login/selección de campaña-personaje-rol).

- Revisar el contenedor donde viven los botones rojos "Unirme" (jugador, DM, espectador). Probablemente usan `min-w` fijo o `flex` sin `flex-wrap`.
- Aplicar `w-full`, `flex-wrap`, `gap` consistente y padding lateral para que en 558px (móvil) los botones se ajusten dentro del card.
- Mantener la disposición horizontal actual en escritorio (`sm:` o `md:` breakpoints).

## 2. Botón de pantalla completa – reglas de visibilidad y posición

**Archivo:** `src/components/app/AppShell.tsx` y `src/routes/__root.tsx`.

Reglas nuevas:
- **Mostrar solo en**: 
  - `/` (pantalla principal de login + selección de campaña/personaje)
  - `/campaign/profile` (pantalla principal del personaje)
- **En `/campaign/profile`**: mover el botón a la **izquierda**, justo al lado del botón "atrás" (que regresa al login). Hoy está flotante arriba-derecha y choca con otros íconos (mochila, etc.).
- **En todas las demás rutas** (`/campaign/inventory`, `/campaign/equipment`, `/campaign/dm`, `/campaign/achievements`, `/campaign/boosters`, `/campaign/settings`, `/campaign/spectator`, `/master`): ocultar.

Implementación:
- En `AppShell` leer `useLocation()` y renderizar `null` si la ruta no es `/` ni `/campaign/profile`.
- Para `/campaign/profile`, renderizar el botón en modo "inline" (no flotante) – exponer una variante o un slot que `campaign.profile.tsx` coloque al lado del botón atrás. Lo más simple: añadir un componente `<FullscreenButton />` reutilizable que `campaign.profile.tsx` ponga junto al botón atrás, y que `AppShell` siga rindiendo solo en `/`.

## 3. Esquema de Potenciadores – nuevos campos

**Migración Supabase** (tabla `boosters`) – añadir columnas opcionales:
- `external_id` text (el "ID" del archivo, p.ej. `P-001`)
- `tipo` text
- `modo_lanzamiento` text
- `distancia` text
- `objetivos` text
- `dados` text (campo "Dados a tirar" sin el bonus)
- `efecto` text

Mantener: `name`, `rarity`, `uses`, `max_uses`, `owner_character_id`, `campaign_id`, `in_dm_vault`.

Index único parcial: `(campaign_id, lower(external_id))` cuando `external_id` no es null, para hacer upsert por ID.

## 4. Modal de Potenciador – rehacer

**Archivo:** `src/components/app/BoosterEditor.tsx` (y `BoosterCard` para mostrar info nueva).

Campos del modal (en orden):
- ID (editable solo DM)
- Tipo (editable solo DM)
- Rareza (selector: Blanca/Azul/Morada/Dorada – editable solo DM)
- Nombre (editable solo DM)
- Modo de lanzamiento (editable solo DM)
- Distancia (editable solo DM)
- Objetivos (editable solo DM)
- Dados a tirar (editable solo DM) — al lado, **chip no editable** que muestra `+3/+4/+5/+6` según rareza (Blanca=+3, Azul=+4, Morada=+5, Dorada=+6).
- Efecto o Condición (textarea, editable solo DM)
- Usos actuales / Usos máximos — **editable solo DM** (jugador los ve pero no los toca).

Permisos:
- **DM**: todos los campos editables, botón Guardar, Transferir, Devolver a Vault, Eliminar. Sin botón "Usar".
- **Jugador**: campos solo lectura. Botones Usar, Transferir, Tirar.
- **Espectador**: solo lectura, sin botones de acción.

Utility helper `rarityBonus(rarity)` → 3/4/5/6 (en `src/lib/game.ts`).

## 5. Lógica de "Usar" potenciador

Ya existe parcialmente. Confirmar/ajustar en `BoosterEditor`:
1. `uses -= 1`
2. Si `uses > 0` → permanece con el jugador.
3. Si `uses === 0` → mover a Vault del DM (`owner_character_id = null`, `in_dm_vault = true`) **y restaurar `uses = max_uses`**, conservando el resto de campos (nombre, efecto, etc.).

## 6. Parser de importación – XLSX + TXT nuevo

**Archivo nuevo:** `src/lib/boosterImport.ts`.

Dependencia: `xlsx` (SheetJS) – instalar con `bun add xlsx`.

### XLSX
- Leer hoja "Extra Skills - DND" si existe, si no la primera hoja.
- Saltar fila 1 (título). Fila 2 = encabezados. Fila 3+ = datos.
- Mapear encabezados (case-insensitive, sin tildes): `id`, `tipo`, `rareza`, `nombre`, `modo de lanzamiento`, `distancia`, `objetivos`, `dados a tirar`, `efecto o condicion` / `efecto ó condicion`.

### TXT nuevo
- Dividir por bloques separados por línea en blanco.
- Cada línea: `Etiqueta: valor`. Parsear con regex case/tilde-insensitive.

### Normalización rareza
`Blanca→white, Azul→blue, Morada→purple, Dorada→gold`.

### Validación + preview
Modal de confirmación antes de importar:
- Total detectados / nuevos / a actualizar / con error.
- Lista de errores (campos mínimos faltantes: ID, Tipo, Rareza, Nombre, Efecto).

### Upsert
1. Buscar por `external_id` (mismo `campaign_id`).
2. Si no, buscar por `lower(trim(name))` normalizado sin tildes.
3. Si match → `update` (preservando `uses`, `max_uses` si ya fueron editados).
4. Si no → `insert` con `uses=1, max_uses=1, in_dm_vault=true`.

### Compatibilidad legacy
- El parser TXT con "/" se elimina como entrada principal pero NO crashea: si detecta una línea con `/` y sin etiquetas reconocidas, la marca como error con mensaje "Formato antiguo no soportado, usa el nuevo formato por bloques".
- Aceptar `.xlsx` y `.txt`. (`.docx` queda fuera por complejidad — lo menciono al usuario; si lo necesita podemos añadirlo después con `mammoth`.)

## 7. UI de importación en panel DM

**Archivo:** `src/routes/campaign.dm.tsx` (sección Boosters).

- Reemplazar input actual `.txt` por input `accept=".xlsx,.txt"`.
- Mostrar texto de ayuda con los dos formatos.
- Tras parsear, mostrar modal preview con conteos y botón "Confirmar importación".

## 8. Migración de datos existentes

Los potenciadores ya creados con el formato viejo (solo `name`, `rarity`, `uses`, `max_uses`) seguirán funcionando — los nuevos campos son opcionales. El modal mostrará campos vacíos editables. No hay backfill automático: el DM puede reimportar el .xlsx para enriquecerlos (el upsert por nombre normalizado los rellenará).

---

## Archivos afectados

- **Migración SQL** (nuevas columnas + índice único parcial)
- `src/routes/index.tsx` (UI móvil botones Unirme)
- `src/components/app/AppShell.tsx` (visibilidad fullscreen)
- `src/routes/campaign.profile.tsx` (botón fullscreen inline al lado del atrás)
- `src/lib/game.ts` (helper `rarityBonus`)
- `src/lib/boosterImport.ts` (nuevo – parser xlsx/txt)
- `src/components/app/BoosterEditor.tsx` (modal completo + permisos)
- `src/components/app/BoosterCard.tsx` (mostrar tipo/ID si se quiere)
- `src/routes/campaign.dm.tsx` (UI import + preview)
- `package.json` (+ `xlsx`)

## Confirmación

¿Apruebas el plan o quieres que ajuste algo (por ejemplo soporte `.docx` ya, o que la importación borre potenciadores que ya no estén en el archivo)?

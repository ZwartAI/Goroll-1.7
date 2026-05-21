## Objetivo

En el Escenario (visible en /campaign/dm, /campaign/profile y /campaign/spectator), cambiar el retrato redondo de cada `PlayerCard` por un retrato cuadrado, y hacer que tocar específicamente el área del retrato abra el visor de imagen de cuerpo completo (`CharacterImageViewer`). Tocar el resto de la tarjeta seguirá abriendo la ficha del personaje como hasta ahora.

## Cambios

### 1. `src/components/app/Escenario.tsx` — `PlayerCard`
- Reemplazar el contenedor del retrato:
  - De `rounded-full w-14 h-14` (círculo) → `aspect-square w-16 rounded-md` (cuadrado, esquinas suaves coherentes con `ornate-card`).
  - Mantener borde de color del personaje, indicador online y badge de nivel; reubicarlos sobre el cuadrado.
- Añadir prop `onOpenImage?: (id: string) => void`.
- Envolver el bloque del retrato en un `<button>` interno con `onClick={(e) => { e.stopPropagation(); onOpenImage?.(c.id); }}` para que el tap del retrato no dispare el `onClick` exterior de la tarjeta.
- El `<button>` exterior de la tarjeta sigue ejecutando `onClick` (abrir ficha).

### 2. Propagar `onOpenImage` desde `Escenario` hacia consumidores
- Añadir prop opcional `onOpenImage?: (id: string) => void` al componente `Escenario` y pasarlo al `PlayerCard`.
- Si no se provee, hacer fallback a `onOpenChar` (comportamiento actual: abrir ficha) para no romper otras vistas.

### 3. `src/routes/campaign.profile.tsx`
- Pasar `onOpenImage` al `<Escenario>` para que abra `CharacterImageViewer` con el personaje correspondiente.
- Reutilizar el modal `CharacterImageViewer` ya existente. Se necesita un estado `imgViewerCharId: string | null` (separado del actual `imgViewer` booleano que es para el propio personaje), o reusar el mismo modal cargando el personaje desde `characters.find(...)`.

### 4. `src/routes/campaign.dm.tsx`
- Localizar dónde se renderiza `<Escenario>` (tab `escenario`) y pasar `onOpenImage`.
- Añadir estado `viewerCharId: string | null` y renderizar `<CharacterImageViewer character={characters.find(c => c.id === viewerCharId)} canEdit={false} onClose={() => setViewerCharId(null)} onEditFace={()=>{}} onEditBody={()=>{}} />`.
- Importar `CharacterImageViewer`.

### 5. `src/routes/campaign.spectator.tsx`
- Mismo patrón que en DM: estado para id seleccionado, renderizar `CharacterImageViewer` con `canEdit={false}`.

### 6. i18n
- No hay textos nuevos visibles; `CharacterImageViewer` ya usa `useT`. No se introducen strings hardcodeados.

## Notas

- `canEdit` en DM/Spectator se pasa como `false` para evitar mostrar los botones “Editar cara/cuerpo” a quien no es dueño del personaje. En `profile`, cuando el id coincide con el personaje propio se usa `canEdit={true}`.
- El cambio de forma (círculo → cuadrado) es solo presentacional; HP, nivel, indicador de voz y estado online se mantienen.

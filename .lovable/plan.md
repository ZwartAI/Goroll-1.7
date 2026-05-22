# Uso de Skill + condiciones cruzadas

Solo se tocan el modal de uso de skill de jugadores, la resolución de skills (`combat-skills.ts`), el panel de condiciones del personaje y los locales. No se modifica iniciativa, turnos, Bestiario, Enemy Sheet ni la lógica de combate del DM.

---

## 1) Renombrar el modal a "Uso de Skill"

Archivo: `src/components/app/SkillUseModal.tsx` (lo dejamos con este nombre interno, pero añadimos un título visible).

- Añadir cabecera con el rótulo del bloque: **"Uso de Skill"** (es) / **"Skill Use"** (en) encima del nombre de la skill.
- Nuevas claves i18n: `combat.skillUse.blockTitle` en `es` y `en`.
- Nota para futuras referencias: este componente es el **bloque "Uso de Skill"**.

## 2) Selección de objetivos por etiquetas

Reemplazar la sección actual "Selected targets" por dos sub-bloques con título:

- **Personajes** (incluye al propio personaje y a los aliados del combate):
  - Tags clickables con color del personaje.
  - El tag del propio personaje aparece primero, marcado como "(Tú)".
  - Sustituye al checkbox `self` actual.
- **Enemigos**: tags con icono y color de cada enemigo invocado no derrotado.

Actualización en tiempo real: suscripción Supabase Realtime a `combat_participants` filtrada por `encounter_id` dentro del modal, para refrescar la lista si entran/salen personajes o enemigos mientras el modal está abierto.

## 3) Modos de reparto al aplicar daño/sanación/escudo

Cuando `resolution` sea `damage`, `heal` o `shield` **y haya más de un objetivo seleccionado** (o el origen pertenezca a un Enlace), mostrar un selector "Modo de aplicación" con estas opciones:

- **Directo (ignora defensa)** — el número va completo a cada objetivo, sin restar defensa.
- **Con defensa** — se resta la defensa de cada objetivo (comportamiento actual de `applyDefense`).
- **Dividir entre golpeados** — el total se reparte equitativamente (resto al primero) entre los objetivos.
- **Grupo de Enlace** — si el origen está enlazado, el daño se reparte entre todos los miembros del Enlace del objetivo (si se golpea a un miembro de un grupo enemigo enlazado, afecta a todo el grupo).

El selector queda oculto cuando solo hay un objetivo y no aplica Enlace.

## 4) Daño a personajes en tiempo real

Hoy `damage` solo afecta a enemigos. Cambios en `src/lib/combat-skills.ts`:

- Permitir `damage` también sobre `ally` y `self`: nueva helper `applyDamageToCharacter(targetId, raw, applyDefense)` que respeta defensa total (`totals().defense`) y consume escudos temporales antes de HP (siguiendo el orden FIFO ya soportado por `combat_temporary_effects`).
- Integrar los modos del punto 3 en `useSkill` (parámetros nuevos en `ResolvePayload`: `distribution: "direct" | "defense" | "split" | "linkGroup"`).
- Actualizar `current_hp` directamente → el realtime de personajes ya está suscrito en `CharacterSheetModal`, `Escenario` y `campaign.spectator`, así que el cambio se ve al instante.
- Añadir detalle por objetivo en el log (`damage` array ya existe; solo se enriquece con el modo aplicado).

## 5) Jugadores pueden aplicar condiciones a enemigos en combate

Archivo: `src/components/app/ConditionsPanel.tsx`.

- Cuando exista un `combat_encounters` activo en la campaña del personaje y el personaje sea participante, mostrar un toggle "Aplicar a..." en el formulario de añadir condición con dos pestañas:
  - **A mí / aliado** (comportamiento actual → `character_conditions`).
  - **A enemigo en combate** (nuevo): muestra tags con los enemigos vivos del encuentro y crea una fila en `combat_temporary_effects` con `effect_type: "debuff" | "control" | "note"` según el catálogo, `target_enemy_participant_id`, `source_character_id`, `duration_rounds` y `label` del catálogo.
- El panel se suscribe a `combat_encounters` para actualizar la disponibilidad del toggle en tiempo real.
- El DM verá la condición aparecer al instante en el `EnemyEffectsStrip` ya implementado en Fase 1.

## 6) i18n

Añadir claves en `src/lib/locales/es.ts` y `en.ts`:

- `combat.skillUse.blockTitle` → "Uso de Skill" / "Skill Use".
- `combat.skillUse.charactersHeading` → "Personajes" / "Characters".
- `combat.skillUse.enemiesHeading` → "Enemigos" / "Enemies".
- `combat.skillUse.youTag` → "(Tú)" / "(You)".
- `combat.skillUse.distributionLabel`, `distDirect`, `distWithDefense`, `distSplit`, `distLinkGroup`.
- `combat.conditions.applyToHeading`, `applyToSelfAlly`, `applyToEnemy`, `pickEnemy`, `appliedToEnemy`.

Nota: no se deja texto hardcodeado en español/inglés en los componentes nuevos.

---

## Detalles técnicos

- **Sin migraciones**: `combat_temporary_effects` ya tiene `target_enemy_participant_id`, `source_character_id`, `effect_type`, `value`, `label`, `duration_rounds`. La condición aplicada por un jugador a un enemigo se mapea a esa tabla. `character_conditions` solo se sigue usando para condiciones sobre jugadores (sin combate o sobre aliados).
- **Cálculo de defensa de personaje**: usar `totals(character, equippedItems).defense` (helper existente en `@/lib/game`).
- **Consumo de escudos**: extraer los efectos `shield` del personaje (`listShieldsForEncounter` + `totalShieldForCharacter`) y reducir uno por uno con `reduceShield` antes de tocar HP.
- **Modo "Grupo de Enlace"**: usar `groupForCharacter`/`groupForParticipant` ya existentes para expandir los objetivos antes de aplicar el daño.
- **Suscripciones realtime**: usar `supabase.channel("skill-modal-" + encounter.id).on("postgres_changes", ..., "combat_participants", filter: encounter_id=eq...)`.
- **Reset de selección**: al cambiar el modo de distribución no se borran los objetivos.

---

## Archivos afectados

```text
src/components/app/SkillUseModal.tsx       (UI + realtime + distribución)
src/components/app/ConditionsPanel.tsx     (toggle aplicar a enemigo)
src/lib/combat-skills.ts                   (daño a personajes, distribución, helpers)
src/lib/locales/es.ts                      (claves nuevas)
src/lib/locales/en.ts                      (claves nuevas)
```

Sin cambios en base de datos, sin tocar `client.ts`, `types.ts` ni el flujo de turnos.

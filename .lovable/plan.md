# FASE 1 — Iniciativa y Combate (jugadores only)

Sistema controlado por el DM con realtime. Sin enemigos, sin daño automático, sin DnD.

## 1. Base de datos (migración Supabase)

Tres tablas nuevas + realtime publication:

**`combat_encounters`**
- `id`, `campaign_id`, `status` ('collecting' | 'active' | 'ended'),
  `requested_by_character_id` (nullable), `current_turn_index` (int default 0),
  `created_at`, `started_at` (nullable), `ended_at` (nullable).
- Índice único parcial: solo 1 encounter no-ended por `campaign_id`.

**`combat_turn_groups`** (Enlaces)
- `id`, `encounter_id`, `campaign_id`, `leader_character_id`, `name` (opcional),
  `color` (opcional), `group_initiative` (int), `created_at`.

**`combat_participants`**
- `id`, `encounter_id`, `campaign_id`, `character_id`, `participant_type` ('player' por ahora),
  `display_name`, `image_url`, `color`, `initiative` (int 1-20),
  `turn_group_id` (nullable FK lógica a turn_groups), `is_leader` (bool),
  `order_index` (int), `has_ended_turn` (bool default false), `created_at`.
- Único `(encounter_id, character_id)` para evitar doble inscripción.

RLS abierta `public_all` (consistente con resto del proyecto). Las tres tablas se añaden a `supabase_realtime` y a la carga + subscripción del `CampaignProvider`.

## 2. Estado compartido

Extender `CampaignProvider`:
- Cargar `currentEncounter` (encounter no-ended más reciente), sus `participants` y `turnGroups`.
- Suscribir realtime a las 3 tablas.
- Exponer helpers: `combat: { encounter, participants, groups, orderedTurns, activeTurn }`.

`orderedTurns` = bloques ordenados por iniciativa desc; cada bloque es solo-personaje o grupo (con miembros).

## 3. Acciones (helpers en `src/lib/combat.ts`)

- `requestInitiative(campaignId, byCharId)` → crea encounter status `collecting` + log "DM pidió iniciativa.".
- `cancelInitiative(encounterId)` → status `ended` + log.
- `submitInitiative(encounterId, charId, value, groupId?)` → upsert participant (clamp 1-20).
- `createLink(encounterId, leaderCharId, memberCharIds[], initiative)` → crea group (max 3 incluyendo líder), inserta/actualiza participants con `turn_group_id`, líder = leader, `is_leader=true`. Valida que el caller sea el líder.
- `startCombat(encounterId)` → calcula `order_index` por iniciativa desc (grupos por `group_initiative`), `status=active`, `current_turn_index=0` + log.
- `passTurn(encounterId, fromCharId)` → valida que el char esté en el bloque activo; marca `has_ended_turn=true` para él y, si es grupo, para todo el grupo; avanza `current_turn_index`; si llega al final → wrap a 0 y resetea `has_ended_turn=false` (nueva ronda) + log.
- `dmAdvanceTurn(encounterId)` / `dmRetreatTurn(encounterId)` → DM-only.
- `endCombat(encounterId)` → status `ended` + log "DM terminó el combate.".

## 4. UI Jugador (Character Sheet / Profile)

Reemplazar/añadir al lado del bloque de "iniciativa" un botón principal:

- `status=null|ended` → "Iniciativa" desactivado, oscuro.
- `status=collecting` y aún no inscrito → "Iniciativa" activo (gold pulse).
- `collecting` ya inscrito → "Esperando al DM" (disabled, muted).
- `active` y NO es su turno → "Esperando turno" (disabled).
- `active` y SÍ es su turno (o el de su grupo) → "Pasar turno" (gold/gain).

Modal `InitiativeRollModal`:
- Input numérico (1-20, clamp).
- Sección opcional "Crear Enlace": multi-select de jugadores online (max 2 además del propio), genera grupo al confirmar.
- Botón Confirmar.

## 5. UI DM (`/campaign/dm`)

Tarjeta nueva "Combate":
- Si `status=null|ended` → botón "Pedir iniciativa".
- Si `collecting` → lista en vivo de inscritos (avatar, nombre, iniciativa, badge "Enlace" + líder). Botones "Iniciar combate" (disabled si 0) y "Cancelar iniciativa".
- Si `active` → lista de turnos (igual a Escenario), botones "Turno anterior", "Pasar turno (DM)", "Terminar combate".

## 6. Vista Escenario — pestañas Log / Combate

`Escenario.tsx`: si hay `combat.encounter` con status `active`, mostrar tabs pequeñas dentro de la card del Log: **Log** | **Combate**. Default = Combate cuando está activo.

`CombatList`:
- Renderiza bloques ordenados. Cada bloque solo o grupo (border + bg compartido + label "Enlace" + corona en líder).
- Avatar circular con color, nombre, iniciativa.
- Badge derecho "En turno" / "Active Player" en bloque activo.

## 7. Logs

Usar `pushLog` con segmentos `char` para nombres. Eventos:
- DM pidió iniciativa / canceló / inició / terminó.
- "X se inscribió a iniciativa (12)".
- "X creó Enlace con Y, Z".
- "X terminó su turno" / "El Enlace de X terminó su turno".

## 8. Permisos

DM = `members[user_id].role==='dm'` (ya disponible). Validar en cada acción:
- Jugadores: solo submit propio, crear enlace siendo líder, pasar turno propio/grupo.
- DM: pedir/cancelar/iniciar/avanzar/retroceder/terminar.
- Espectadores: solo lectura.

## 9. i18n

Añadir a `es.ts`/`en.ts` bloque `combat.*` con todas las strings (botones, modal, badges, logs).

## 10. Validaciones

- Único encounter activo por campaña (índice parcial DB).
- Anti doble-inscripción (unique constraint).
- Iniciativa 1-20 (clamp cliente + check DB).
- Enlace max 3.
- Pass turn solo si bloque activo.

## Archivos a crear/editar

Crear:
- `supabase/migrations/<timestamp>_combat_phase1.sql`
- `src/lib/combat.ts`
- `src/components/app/InitiativeRollModal.tsx`
- `src/components/app/CombatList.tsx`
- `src/components/app/CombatDMPanel.tsx`
- `src/components/app/InitiativeButton.tsx`

Editar:
- `src/lib/CampaignProvider.tsx` (cargar combate + realtime)
- `src/components/app/Escenario.tsx` (tabs Log/Combate)
- `src/routes/campaign.profile.tsx` (botón Iniciativa)
- `src/routes/campaign.dm.tsx` (CombatDMPanel)
- `src/lib/locales/{es,en}.ts`

## Notas

- Logs reutilizan `pushLog` existente.
- No se toca `characters.initiative` ni lógica de skills/buffs/HP.
- `participant_type` queda preparado para 'enemy' en fases futuras.

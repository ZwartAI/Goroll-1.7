# Fase 3 — Compendio de NPCs

Crear un compendio independiente de NPCs (paralelo al Bestiario) que pueda invocarse al combate y comportarse exactamente como un enemigo, sin mezclar ambos compendios.

## 1. Base de datos (migración)

Tablas nuevas, separadas del Bestiario:

- **`npc_templates`**: `id`, `campaign_id`, `name`, `npc_type` (civil, mercader, médico, guía, guardia, aliado, invitado, invocado, narrativo, otro), `role` (damage/tank/support/control/skirmisher/summoner/terrain/hunter/protector), `biome`, `icon_key`, `color`, `max_hp`, `defense`, `speed`, `base_damage`, `description`, `personality`, `lore`, `service_notes`, `behavior_notes`, `weaknesses_text`, `immunities` (jsonb), `disposition` (ally/neutral/hostile), `created_by_character_id`, `image_url`, `image_offset_x/y`, `image_scale`, `created_at`, `updated_at`.
- **`npc_template_skills`**: misma forma que `enemy_template_skills`, FK a `npc_template_id`.
- GRANTs + RLS `public_all` (mismo patrón que `enemy_templates`).
- Publicar en `supabase_realtime`.

Extender `combat_participants`:
- Permitir `participant_type = 'npc'`.
- Añadir `npc_template_id uuid null` y `npc_disposition text null` (ally/neutral/hostile).
- Reutilizar columnas `enemy_*` existentes (hp, defense, image, etc.) para no duplicar — al ser combatiente comparte estructura. (Documentado en código).

Extender `combat_enemy_skills` con `source_kind text default 'enemy'` y `npc_template_id` nullable, **o** crear `combat_npc_skills` espejo. Recomendación: reutilizar `combat_enemy_skills` añadiendo `source_kind` para no duplicar la lógica de “Usar skill” de Fase 2.

## 2. Librería `src/lib/npcs.ts`

Espejo de `bestiary.ts` pero para NPCs:
- `listNpcTemplates`, `createNpcTemplate`, `updateNpcTemplate`, `duplicateNpcTemplate`, `deleteNpcTemplate`.
- `listNpcTemplateSkills`, CRUD de skills.
- `summonNpcToCombat({ templateId, encounterId, qty, initiative, position, customName })`: copia HP/DEF/imagen/skills al participante, mismo `afterCurrent` shift fix de Fase actual.

## 3. UI

- **Ruta nueva**: `src/routes/campaign.npcs.tsx` (espejo de `campaign.bestiary.tsx`).
- Acceso desde menú DM, junto a Bestiario (no lo reemplaza).
- Componentes nuevos en `src/components/app/`:
  - `NpcManagerDM.tsx` (lista + filtros: nombre, tipo, rol, bioma, disposición).
  - `NpcEditorModal.tsx` (reutiliza `EnemyImageEditor`, `EnemyIconPicker` con su fix de Fase 1).
  - `NpcSkillsEditor.tsx` (reutilizable con el de enemigos si existe componente compartido).
  - `NpcSheetModal.tsx` (ficha rápida en combate).
  - `NpcAddToCombatModal.tsx` (iniciativa, posición, cantidad, nombre).
- **Combate**: en `CombatList` / `CombatDMPanel` / `Escenario`, tratar `participant_type === 'npc'` igual que enemigo, con etiqueta visual pequeña: `NPC` + chip de disposición (Aliado/Neutral/Hostil).
- Reutilizar `EnemySkillUseModal` (renombrado lógicamente o aceptando NPC) para skills de NPCs con todo el flujo de Fase 2 (roll, objetivos, defensa/directo/dividido/Enlace).
- Reutilizar `EnemyDamageModal`, curación, turnos extra (`combat_turn_pins`), efectos, escudos, logs — todo aplica por `participant_type` en (`enemy`, `npc`).

## 4. Logs

- Crear NPC, invocar al combate, retirar, usar skill — usar `pushLog` con segmentos consistentes con los de enemigos.

## 5. i18n

Añadir bloque `npcs.*` y `combat.npc.*` en `es.ts` y `en.ts` con todas las strings listadas.

## 6. Realtime

Añadir canal para `npc_templates` y `npc_template_skills` en `CampaignProvider` o donde se monten los canales de Bestiario.

## 7. Permisos

- DM: CRUD + invocar + controlar.
- Jugador / Espectador: solo lectura en combate, sin acceso a `/campaign/npcs`.

## Fuera de alcance (explícito)

- Importador Excel (estructura preparada, sin UI).
- Rediseño de tarjetas, gestor de combate, reglas de muerte, escudos nuevos, cambios al log de enemigos.

## Notas técnicas

- Reutilizar al máximo: imagen editor, icon picker, skill cards, modales de daño/curación/skill — pasando `participant_type` como discriminador.
- `combat_enemy_skills` se reutiliza añadiendo `source_kind` para evitar duplicar el motor de “Usar skill”.
- Migración se envía aparte y se espera aprobación antes de tocar `types.ts`-dependientes.

```text
Bestiario  ──► enemy_templates ──► combat_participants(type=enemy) ─┐
                                                                     ├─► mismo motor de combate
NPCs       ──► npc_templates   ──► combat_participants(type=npc)  ──┘
```

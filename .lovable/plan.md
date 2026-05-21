# Plan: Performance + Excel Import Improvements

Large multi-part change. Splitting into focused phases so each piece can be verified before moving to the next.

## Phase 1 — Performance: split CampaignProvider loads

**Goal:** initial paint shows core data fast; heavy modules load on demand; realtime updates only the affected slice.

- Audit `CampaignProvider` / `useGameData` to map every query + realtime subscription.
- Split the single `load()` into focused loaders:
  - `loadCore()` — campaign, current character, character list (minimal), active combat, role.
  - `loadCombat()`, `loadLogs(limit=50)`, `loadAchievements()`, `loadBoosters()`, `loadSkills(characterId)`, `loadBestiary()`, `loadInventory(characterId)`, `loadVault()`.
- Realtime: per-table handlers do targeted state patches (insert/update/delete on the local array) instead of calling full `load()`. Filter every channel by `campaign_id=eq.{id}` where the column exists.
- Logs: cap to latest 50–100, expose `loadMoreLogs()`.
- Per-module loading flags so UI can render partial.
- Lazy-load images in lists (`loading="lazy"`, `decoding="async"`); avoid pulling `image_url` in list views when an avatar/thumbnail variant suffices.

Risk: targeted realtime patches are error-prone. We keep `load{Module}()` fallback for unknown events.

## Phase 2 — Excel files are not persisted

- Remove any code path that uploads imported Excel to Storage or stores base64 in a row.
- Importers (skills, boosters, future enemies) parse in-memory, create rows, then drop the File reference.
- Document inline that backup of source Excel is intentionally not stored.

## Phase 3 — Enemy / Monster Excel import

- Rename UI strings: "Monstruo" → "Enemy or Monster" / "Enemigo o Monstruo" in the creator entry points (keep DB unchanged).
- New "Importar Excel" button in `MonsterEditor` / Bestiary create flow.
- Parser (using existing `xlsx` if present, else add) supports:
  - **Option B (preferred):** two sheets — `Enemies` and `Enemy Skills` joined by `enemy_key`.
  - **Option A (fallback):** single sheet with `Skill N <field>` columns.
- Preview modal lists: detected enemies, detected skills, duplicates (by normalized name), invalid biomes, ignored rows, warnings. No native confirm — reuse `ConfirmDialog`.
- Duplicate handling per row: Update / Skip / Create duplicate.
- Validation: name required, hp>0, defense≥0, allow bracketed tokens + accents in skill fields, skip skills with empty name.
- Double-submit guard on import button.

## Phase 4 — Tier → visual asset + border defaults

- Central map in `src/lib/bestiary.ts`:
  - normal → `1 Normal.png`, white border
  - elite → `2 Elite.png`, green border
  - boss → `3 Boss.png`, red border
  - god → `4 God.png`, gold border
  - hero_female → `Heroe Fem.png`, pink border
  - hero_male → `Heroe Male.png`, purple border
- Editor: when tier changes and no manual asset chosen, default asset + border. If user manually picked an asset, don't overwrite.
- Importer: same rule.

## Phase 5 — Automatic icon fallback (no tier)

- Helper `pickAutoIcon(name, role)` mapping keywords (lobo/bestia, guardia/soldado, mago, ojo, veneno/araña, sombra/espectro, jefe/rey, …) to existing icons in `EnemyIconPicker`.
- Used when tier missing/unrecognized and no icon supplied.

## Phase 6 — Biome handling

- Validate against fixed list (Praivell, Ignivar, Saavakar, Arboris, Snofell, Silvamyr, Pilar del pulso). Unknown → warning in preview, importable as "otra región" if DM confirms; never blocks the whole import.

## Phase 7 — i18n

- Add ES/EN keys: enemy_or_monster, import_enemy_excel, detected_enemies, detected_skills, excel_not_stored_notice, import_preview, confirm_import, tier_unknown_warning, asset_auto_assigned, icon_auto_assigned.

## Out of scope (unchanged)

Player skills, Skill Points, skill purchase, inventory, equipment, notes, vault, turn flow, Link system, boosters logic (only file-not-stored rule applies to its importer).

## Suggested approval order

This is large enough that I'd like to ship and verify in two passes:

1. **Pass A:** Phases 1 + 2 (perf + no Excel storage).
2. **Pass B:** Phases 3–7 (enemy Excel import + tier assets + icons + biomes + i18n).

Reply "go" to start Pass A, or tell me to do everything in one pass / reorder.

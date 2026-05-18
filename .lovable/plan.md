Voy a entregar tres cambios mayores. Resumo qué se va a construir y cómo, para confirmar antes de tocar la base de datos.

## 1. Expulsión real de jugadores

Cuando el DM remueve a un jugador en "Editar campaña":
- Se eliminan **todos** sus personajes de esa campaña (no solo los DM).
- Sus **items y boosters** se transfieren al Vault del DM (se setea `owner_character_id = null`, `in_dm_vault = true`) en lugar de borrarse.
- Sus **logros**, **notas**, **condiciones** y filas dependientes de esos personajes se borran (cascada manual desde el cliente).
- El usuario expulsado se registra en una nueva tabla `campaign_bans` para que no pueda auto-reingresar.

Resultado: deja de aparecer en el escenario y en cualquier listado, y no figura como "desconectado".

## 2. Solicitudes de reingreso + Buzón

- Se reutiliza `dm_join_requests` agregándole `kind text default 'codm'`. Para jugadores expulsados que quieren volver, se crea con `kind = 'player_rejoin'`.
- Al entrar a una campaña, si el user está en `campaign_bans` y no es miembro, en lugar de unirse automáticamente se le muestra un botón "Solicitar reingreso al DM" que inserta un registro pending.
- Nuevo **icono de buzón (sobre)** en `AppShell`, a la derecha del botón maximizar, con punto rojo si hay solicitudes pendientes (Co-DM o reingreso) para campañas que el usuario posee. Al hacer clic abre un modal con la lista; el DM puede Aceptar / Rechazar.
- Aceptar un `player_rejoin` quita la fila de `campaign_bans` y agrega `campaign_members` con rol `player`.
- También se listan las solicitudes pendientes dentro del editor de campaña (sección nueva "Solicitudes").

## 3. Estadística Nivel

- Migración: `ALTER TABLE characters ADD COLUMN level int NOT NULL DEFAULT 1`.
- En el perfil del jugador (`campaign.profile.tsx`): se reduce el ancho del recuadro de **Monedas**, y al lado se coloca **Daño**. En el lugar donde estaba "Daño" se pone el nuevo recuadro **Nivel** (editable por el dueño/DM).
- El nivel se muestra (solo lectura para roles que no editan) en:
  - `CharacterSheetModal`
  - `Escenario` (tarjetas de personajes)
  - `campaign.dm.tsx` (panel DM)
  - `campaign.spectator.tsx` (cards de jugadores)
- Todos los textos nuevos pasan por i18n (`en.ts` y `es.ts`).

## Detalles técnicos

```text
Migración SQL
─────────────
ALTER TABLE characters ADD COLUMN level int NOT NULL DEFAULT 1;
ALTER TABLE dm_join_requests ADD COLUMN kind text NOT NULL DEFAULT 'codm';
CREATE TABLE campaign_bans (
  id uuid PK default gen_random_uuid(),
  campaign_id uuid NOT NULL,
  user_id uuid NOT NULL,
  banned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, user_id)
);
ALTER TABLE campaign_bans ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_all ON campaign_bans FOR ALL USING (true) WITH CHECK (true);
```

Archivos a editar/crear:
- nuevo `src/components/app/MailboxButton.tsx`
- editar `CampaignMembersEditor.tsx` (cascada + sección solicitudes)
- editar `AppShell.tsx` (icono buzón)
- editar `CampaignProvider.tsx` (chequear ban antes de auto-join)
- editar `campaign.profile.tsx` (layout Monedas/Daño/Nivel)
- editar `CharacterSheetModal.tsx`, `Escenario.tsx`, `campaign.dm.tsx`, `campaign.spectator.tsx` (mostrar nivel)
- editar `src/lib/game.ts` (tipo Character con `level`)
- editar `src/lib/locales/en.ts` y `es.ts` (nuevas claves)

¿Procedo con la migración y los cambios?
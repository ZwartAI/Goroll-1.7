ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS hp_damage_taken integer NOT NULL DEFAULT 0;

UPDATE public.characters c
SET hp_damage_taken = GREATEST(
  0,
  (
    c.base_hp + COALESCE((
      SELECT SUM(
        CASE
          WHEN i.hp_bonus > 0 THEN i.hp_bonus
          WHEN i.rarity = 'white'  THEN 4
          WHEN i.rarity = 'blue'   THEN 8
          WHEN i.rarity = 'purple' THEN 15
          WHEN i.rarity = 'gold'   THEN 25
          ELSE 0
        END
      )
      FROM public.items i
      WHERE i.owner_character_id = c.id
        AND i.equipped = true
        AND i.slot NOT IN ('arma_principal','arma_secundaria')
    ), 0)
  ) - c.current_hp
);
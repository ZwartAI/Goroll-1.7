ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS inventory_slot_type text NOT NULL DEFAULT 'normal';

ALTER TABLE public.items
  DROP CONSTRAINT IF EXISTS items_inventory_slot_type_check;

ALTER TABLE public.items
  ADD CONSTRAINT items_inventory_slot_type_check
  CHECK (inventory_slot_type IN ('normal', 'temporary'));
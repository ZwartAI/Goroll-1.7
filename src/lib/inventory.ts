import { supabase } from "@/integrations/supabase/client";
import { totals, type Character, type Item } from "./game";
import { nextHpOnMaxChange } from "./hp";

/**
 * Centralized backpack <-> equipment logic.
 *
 * Invariants:
 *   - `equipped=true`  → the item does NOT occupy any backpack slot.
 *   - `equipped=false` AND `inventory_slot_type='normal'`    → occupies one of the
 *                                                              character's normal
 *                                                              backpack slots.
 *   - `equipped=false` AND `inventory_slot_type='temporary'` → occupies an extra
 *                                                              temporary slot
 *                                                              auto-created on
 *                                                              unequip when the
 *                                                              backpack was full.
 *
 * Temporary slots only exist while an item is in them. They are created ONLY when
 * unequipping with a full backpack, never from loot, purchase or transfer.
 */

export type SlotKind = "normal" | "temporary";

export function getSlotKind(item: Item): SlotKind {
  const v = (item as any).inventory_slot_type as SlotKind | null | undefined;
  return v === "temporary" ? "temporary" : "normal";
}

export function getMaxSlots(character: Character | null | undefined): number {
  return (character as any)?.backpack_slots ?? 20;
}

/** Items owned by the character, not equipped, that occupy a NORMAL backpack slot. */
export function normalBackpackItems(owned: Item[]): Item[] {
  return owned.filter(i => !i.equipped && getSlotKind(i) === "normal");
}

/** Items owned by the character, not equipped, that occupy a TEMPORARY slot. */
export function temporaryBackpackItems(owned: Item[]): Item[] {
  return owned.filter(i => !i.equipped && getSlotKind(i) === "temporary");
}

/** All equipped items owned by the character. */
export function equippedItems(owned: Item[]): Item[] {
  return owned.filter(i => i.equipped);
}

/**
 * Pulls temporaries into normal slots whenever capacity allows. Safe to call
 * after any inventory mutation; no-op when not needed.
 */
export async function normalizeBackpack(characterId: string, maxSlotsHint?: number) {
  const [chRes, itRes] = await Promise.all([
    maxSlotsHint == null
      ? supabase.from("characters").select("backpack_slots").eq("id", characterId).maybeSingle()
      : Promise.resolve({ data: { backpack_slots: maxSlotsHint } as any }),
    supabase.from("items").select("*").eq("owner_character_id", characterId),
  ]);
  const maxSlots = (chRes.data as any)?.backpack_slots ?? 20;
  const owned = (itRes.data || []) as Item[];
  const normalCount = normalBackpackItems(owned).length;
  const temps = temporaryBackpackItems(owned);
  const slotsAvailable = Math.max(0, maxSlots - normalCount);
  if (slotsAvailable <= 0 || temps.length === 0) return;
  const toPromote = temps
    .sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""))
    .slice(0, slotsAvailable);
  await Promise.all(
    toPromote.map(i =>
      supabase
        .from("items")
        .update({ inventory_slot_type: "normal" } as any)
        .eq("id", i.id),
    ),
  );
}

/** Recalculates HP when the equipped set changes, following the central rule. */
async function syncHpAfter(character: Character, prevEquipped: Item[], nextEquipped: Item[]) {
  const oldMax = totals(character, prevEquipped).maxHp;
  const newMax = totals(character, nextEquipped).maxHp;
  if (oldMax === newMax) return;
  const nextHp = nextHpOnMaxChange(character.current_hp, oldMax, newMax);
  if (nextHp !== character.current_hp) {
    await supabase.from("characters").update({ current_hp: nextHp }).eq("id", character.id);
  }
}

/**
 * Equip an item from the backpack into its slot. Handles same-slot swap
 * (the displaced equipped item is sent back to the backpack into the slot
 * just freed by the newly equipped item; falls back to a temporary slot
 * only if absolutely no normal space exists).
 */
export async function equipItem(item: Item, character: Character, owned: Item[]) {
  if (item.equipped) return;
  const current = owned.find(i => i.equipped && i.slot === item.slot && i.id !== item.id) || null;
  const prevEquipped = equippedItems(owned);

  // 1) Equip the new item; it leaves the backpack so we clear the temp flag.
  await supabase
    .from("items")
    .update({ equipped: true, inventory_slot_type: "normal" } as any)
    .eq("id", item.id);

  // 2) If we replaced a piece, send it back to the backpack. The new item just
  //    freed exactly one slot (or a temp slot if it was temporary), so there is
  //    always room for the displaced one — keep it normal whenever possible.
  if (current) {
    const remainingOwned = owned.filter(i => i.id !== item.id && i.id !== current.id);
    const normalCount = normalBackpackItems(remainingOwned).length;
    const maxSlots = getMaxSlots(character);
    const kind: SlotKind = normalCount < maxSlots ? "normal" : "temporary";
    await supabase
      .from("items")
      .update({ equipped: false, inventory_slot_type: kind } as any)
      .eq("id", current.id);
  }

  const nextEquipped = prevEquipped
    .filter(i => i.id !== current?.id)
    .concat([{ ...item, equipped: true }]);
  await syncHpAfter(character, prevEquipped, nextEquipped);
  await normalizeBackpack(character.id, getMaxSlots(character));
}

/**
 * Unequip an item back to the backpack. Uses a normal slot when available,
 * otherwise creates a temporary slot (never blocks the action).
 */
export async function unequipItem(item: Item, character: Character, owned: Item[]) {
  if (!item.equipped) return;
  const prevEquipped = equippedItems(owned);
  const maxSlots = getMaxSlots(character);
  const normalCount = normalBackpackItems(owned).length;
  const kind: SlotKind = normalCount < maxSlots ? "normal" : "temporary";

  await supabase
    .from("items")
    .update({ equipped: false, inventory_slot_type: kind } as any)
    .eq("id", item.id);

  const nextEquipped = prevEquipped.filter(i => i.id !== item.id);
  await syncHpAfter(character, prevEquipped, nextEquipped);
  await normalizeBackpack(character.id, maxSlots);
  return kind;
}

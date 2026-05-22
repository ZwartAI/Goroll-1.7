import { supabase } from "@/integrations/supabase/client";
import { totals, type Character, type Item } from "./game";

/**
 * Centralized HP recalculation rule when max HP changes due to equipment.
 *
 * Equipment HP bonus modifies MAX HP only. It must NEVER be subtracted from
 * current HP as if it were damage, nor added as free healing.
 *
 *  - If newMax <= oldMax  (unequip / hp_bonus lowered / item removed):
 *      newCurrent = clamp(currentHp, 0, newMax)
 *      i.e. keep current HP unless it no longer fits in the new max.
 *
 *  - If newMax > oldMax   (equip / hp_bonus raised):
 *      wasFull = currentHp >= oldMax
 *      newCurrent = wasFull ? newMax : currentHp
 *      i.e. only top up the bar if the character was already full.
 *
 *  Final value is always clamped to [0, newMax].
 */
export function nextHpOnMaxChange(currentHp: number, oldMax: number, newMax: number): number {
  const safeOld = Math.max(1, oldMax);
  const safeNew = Math.max(1, newMax);
  let next: number;
  if (safeNew > safeOld) {
    const wasFull = currentHp >= safeOld;
    next = wasFull ? safeNew : currentHp;
  } else {
    next = Math.min(currentHp, safeNew);
  }
  return Math.max(0, Math.min(safeNew, next));
}

/** Backwards-compatible alias used across the equip/unequip call sites. */
export function nextHpOnEquipChange(currentHp: number, oldMax: number, newMax: number, _isEquipping?: boolean): number {
  return nextHpOnMaxChange(currentHp, oldMax, newMax);
}

/**
 * Recomputes a character's max HP from currently equipped items and adjusts
 * current_hp following {@link nextHpOnMaxChange}. `oldMaxHint` MUST be the
 * max HP BEFORE the equipment change; if omitted we fall back to a plain
 * clamp (current_hp <= newMax) so we never accidentally heal.
 */
export async function clampHpForOwner(ownerId: string | null | undefined, oldMaxHint?: number) {
  if (!ownerId) return;
  const [chRes, itRes] = await Promise.all([
    supabase.from("characters").select("*").eq("id", ownerId).maybeSingle(),
    supabase.from("items").select("*").eq("owner_character_id", ownerId).eq("equipped", true),
  ]);
  const ch = chRes.data as Character | null;
  if (!ch) return;
  const newMax = totals(ch, (itRes.data || []) as Item[]).maxHp;
  const nextHp = typeof oldMaxHint === "number"
    ? nextHpOnMaxChange(ch.current_hp, oldMaxHint, newMax)
    : Math.max(0, Math.min(newMax, ch.current_hp));
  if (nextHp !== ch.current_hp) {
    await supabase.from("characters").update({ current_hp: nextHp }).eq("id", ownerId);
  }
}

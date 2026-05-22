import { supabase } from "@/integrations/supabase/client";
import { totals, type Character, type Item } from "./game";

/**
 * HP model
 * --------
 * The canonical state of a character's wounds is `hp_damage_taken` (how many
 * HP they are missing from their CURRENT max). `current_hp` is a denormalised
 * field kept in sync as `max_hp - hp_damage_taken` so the rest of the app can
 * keep reading it directly.
 *
 * Equipping or unequipping gear with an HP bonus only changes max HP. The
 * damage taken is preserved, so the current HP is recomputed from the new max:
 *
 *     newCurrentHp = clamp(newMax - hp_damage_taken, 0, newMax)
 *
 * This prevents the "equip / unequip to heal" exploit: if Iris is 100/125
 * (damage_taken = 25), unequipping +25 HP gear leaves her at 75/100, and
 * re-equipping the same gear restores her to 100/125 (never 125/125).
 *
 * All damage / heal call sites MUST go through {@link applyHpDelta} so the
 * two fields stay consistent.
 */

export type HpCharLike = Pick<Character, "id" | "current_hp"> & { hp_damage_taken?: number | null };

/** Read the persisted damage_taken; falls back to (max - current) when missing. */
export function getDamageTaken(character: HpCharLike, currentMaxHp: number): number {
  const persisted = (character as any).hp_damage_taken;
  if (typeof persisted === "number" && !isNaN(persisted)) {
    return Math.max(0, Math.min(currentMaxHp, persisted));
  }
  return Math.max(0, currentMaxHp - character.current_hp);
}

/**
 * Equipment-only HP recalculation, preserving damage taken.
 * Returns the next current_hp for the given new max.
 */
export function recomputeCurrentHpFromMax(
  damageTaken: number,
  newMax: number,
): number {
  const safeMax = Math.max(1, newMax);
  const safeDmg = Math.max(0, Math.min(safeMax, damageTaken));
  return Math.max(0, Math.min(safeMax, safeMax - safeDmg));
}

/**
 * @deprecated Equipment changes used to drive HP via this helper. Kept as a
 * thin wrapper around the damage-preserving rule so existing imports still
 * compile, but new code should call {@link recomputeCurrentHpFromMax}.
 */
export function nextHpOnMaxChange(currentHp: number, oldMax: number, newMax: number): number {
  const damageTaken = Math.max(0, oldMax - currentHp);
  return recomputeCurrentHpFromMax(damageTaken, newMax);
}

/** Backwards-compatible alias used across the equip/unequip call sites. */
export function nextHpOnEquipChange(currentHp: number, oldMax: number, newMax: number, _isEquipping?: boolean): number {
  return nextHpOnMaxChange(currentHp, oldMax, newMax);
}

/**
 * Recomputes a character's max HP from currently equipped items, preserves
 * hp_damage_taken, and writes both fields back. Use after ANY mutation that
 * changes the equipped set, an equipped item's hp_bonus / rarity, or its
 * ownership.
 *
 * `oldMaxHint` is kept for backwards-compatibility — it is ignored when the
 * character row already has a persisted `hp_damage_taken`, and only used as a
 * fallback for migrations / old data.
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
  const persisted = (ch as any).hp_damage_taken;
  const damageTaken = typeof persisted === "number" && !isNaN(persisted)
    ? Math.max(0, persisted)
    : Math.max(0, (oldMaxHint ?? newMax) - ch.current_hp);
  const nextHp = recomputeCurrentHpFromMax(damageTaken, newMax);
  const clampedDamage = Math.max(0, Math.min(newMax, damageTaken));
  const patch: Record<string, number> = {};
  if (nextHp !== ch.current_hp) patch.current_hp = nextHp;
  if (clampedDamage !== persisted) patch.hp_damage_taken = clampedDamage;
  if (Object.keys(patch).length) {
    await supabase.from("characters").update(patch as any).eq("id", ownerId);
  }
}

/**
 * Apply a damage/heal change. Pass the new current HP value (already clamped
 * by the caller into [0, maxHp]) and the character's CURRENT max HP. Both
 * `current_hp` and `hp_damage_taken` are written so the equipment path can
 * preserve damage correctly later.
 *
 * Returns the patch that was applied so callers can use it for undo metadata.
 */
export async function applyHpDelta(
  characterId: string,
  newCurrentHp: number,
  maxHp: number,
): Promise<{ current_hp: number; hp_damage_taken: number }> {
  const safeMax = Math.max(1, maxHp);
  const clamped = Math.max(0, Math.min(safeMax, newCurrentHp));
  const damageTaken = Math.max(0, safeMax - clamped);
  await supabase
    .from("characters")
    .update({ current_hp: clamped, hp_damage_taken: damageTaken } as any)
    .eq("id", characterId);
  return { current_hp: clamped, hp_damage_taken: damageTaken };
}

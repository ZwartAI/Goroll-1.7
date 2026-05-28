import { supabase } from "@/integrations/supabase/client";
import { totals, type Character, type Item } from "./game";
import { pushLog } from "./log";
import { applyHpDelta } from "./hp";

export type TargetType = "character" | "enemy";
export type DamageMode = "heal" | "directDamage" | "damageWithDefense";

export interface DamageResult {
  raw: number;
  applied: number; // HP reduction
  def: number;     // Mitigated by defense
  absorbed: number; // Mitigated by shield
  newHp: number;
  maxHp: number;
  defeated: boolean;
  shieldBroke?: boolean;
}

/**
 * Central logic for applying damage, healing, and shield absorption to any entity.
 */
export async function resolveDamageAgainstEntity(args: {
  targetId: string;
  targetType: TargetType;
  encounterId: string;
  campaignId: string;
  amount: number;
  mode: DamageMode;
  sourceName?: string;
  skillName?: string;
  skipLogging?: boolean;
}): Promise<DamageResult | null> {
  const { targetId, targetType, encounterId, campaignId, amount, mode, sourceName, skillName, skipLogging } = args;
  const raw = Math.max(0, Math.floor(amount || 0));

  if (targetType === "character") {
    return resolveCharacterDamage(targetId, encounterId, campaignId, raw, mode, sourceName, skillName, skipLogging);
  } else {
    return resolveEnemyDamage(targetId, encounterId, campaignId, raw, mode, sourceName, skillName, skipLogging);
  }
}

async function resolveCharacterDamage(
  targetId: string,
  encounterId: string,
  campaignId: string,
  raw: number,
  mode: DamageMode,
  sourceName?: string,
  skillName?: string,
  skipLogging?: boolean
): Promise<DamageResult | null> {
  const [{ data: ch }, { data: its }, { data: shields }] = await Promise.all([
    supabase.from("characters").select("*").eq("id", targetId).maybeSingle(),
    supabase.from("items").select("*").eq("owner_character_id", targetId).eq("equipped", true),
    (supabase as any).from("combat_temporary_effects")
      .select("*")
      .eq("encounter_id", encounterId)
      .eq("target_character_id", targetId)
      .eq("effect_type", "shield")
      .order("duration_rounds", { ascending: true }) // FIFO by duration (shortest first)
      .order("created_at", { ascending: true }),
  ]);

  if (!ch) return null;
  const t = totals(ch as Character, (its || []) as Item[]);
  const maxHp = t.maxHp;
  const currentHp = ch.current_hp;

  if (mode === "heal") {
    const newHp = Math.min(maxHp, currentHp + raw);
    const applied = newHp - currentHp;
    await applyHpDelta(targetId, newHp, maxHp);
    
    if (applied > 0 && !skipLogging) {
      await pushLog(campaignId, [
        { t: "char", v: ch.name, color: ch.color, id: ch.id },
        { t: "text", v: " " },
        { t: "i18n", v: { key: "combat.heal", params: {} } as any } as any,
        { t: "text", v: `: ` },
        { t: "gain", v: `+${applied} HP` }
      ]);
    }

    return { raw, applied, def: 0, absorbed: 0, newHp, maxHp, defeated: false };
  }

  const useDefense = mode === "damageWithDefense";
  const def = useDefense ? t.defense : 0;
  
  let damagePostDef = Math.max(0, raw - def);
  const totalMitigatedByDef = useDefense ? Math.min(raw, def) : 0;

  if (useDefense && damagePostDef === 0 && raw > 0 && !skipLogging) {
    await pushLog(campaignId, [
      { t: "i18n", v: { key: "combat.defenseBlockedMsg", params: { name: ch.name, amount: raw, def } } as any } as any
    ]);
    return { raw, applied: 0, def: totalMitigatedByDef, absorbed: 0, newHp: currentHp, maxHp, defeated: false };
  }

  let absorbed = 0;
  let shieldBroke = false;

  // Shields absorb damage post-defense
  if (mode !== "directDamage") {
    for (const sh of (shields || []) as any[]) {
      if (damagePostDef <= 0) break;
      const take = Math.min(sh.value || 0, damagePostDef);
      if (take <= 0) continue;
      
      absorbed += take;
      damagePostDef -= take;
      const nextValue = (sh.value || 0) - take;
      
      if (nextValue <= 0) {
        await (supabase as any).from("combat_temporary_effects").delete().eq("id", sh.id);
        shieldBroke = true;
        if (!skipLogging) {
          await pushLog(campaignId, [{ t: "i18n", v: { key: "combat.shieldBrokenMsg", params: { name: ch.name } } as any } as any]);
        }
      } else {
        await (supabase as any).from("combat_temporary_effects").update({ value: nextValue }).eq("id", sh.id);
      }
    }
  }

  const applied = damagePostDef;
  const newHp = Math.max(0, currentHp - applied);
  const defeated = newHp <= 0 && currentHp > 0;
  
  await applyHpDelta(targetId, newHp, maxHp);

  // Logging
  const segments: any[] = [];
  if (sourceName) segments.push({ t: "text", v: `${sourceName} ` });
  if (skillName) segments.push({ t: "text", v: `(${skillName}) ` });
  
  if (mode === "directDamage") {
    segments.push({ t: "char", v: ch.name, color: ch.color, id: ch.id });
    segments.push({ t: "text", v: ` ` });
    segments.push({ t: "i18n", v: { key: "combat.directDamage" } as any } as any);
    segments.push({ t: "text", v: `: ` });
    segments.push({ t: "loss", v: `-${applied} HP` });
  } else {
    segments.push({ t: "char", v: ch.name, color: ch.color, id: ch.id });
    segments.push({ t: "text", v: ` ` });
    segments.push({ t: "i18n", v: { key: "combat.damageWithDefense" } as any } as any);
    segments.push({ t: "text", v: `: ` });
    segments.push({ t: "loss", v: `-${applied} HP` });
    if (totalMitigatedByDef > 0) segments.push({ t: "text", v: ` (DEF ${def} -${totalMitigatedByDef})` });
    if (absorbed > 0) segments.push({ t: "text", v: ` (🛡️ -${absorbed})` });
  }

  if (segments.length > 0 && !skipLogging) {
    await pushLog(campaignId, segments);
  }

  if (defeated && !skipLogging) {
    await pushLog(campaignId, [{ t: "text", v: `${ch.name} fue derrotado.` }]);
  }

  return { raw, applied, def: totalMitigatedByDef, absorbed, newHp, maxHp, defeated, shieldBroke };
}

async function resolveEnemyDamage(
  targetId: string,
  encounterId: string,
  campaignId: string,
  raw: number,
  mode: DamageMode,
  sourceName?: string,
  skillName?: string,
  skipLogging?: boolean
): Promise<DamageResult | null> {
  const [{ data: p }, { data: shields }] = await Promise.all([
    (supabase as any).from("combat_participants").select("*").eq("id", targetId).maybeSingle(),
    (supabase as any).from("combat_temporary_effects")
      .select("*")
      .eq("encounter_id", encounterId)
      .eq("target_enemy_participant_id", targetId)
      .eq("effect_type", "shield")
      .order("duration_rounds", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (!p) return null;
  const part = p as any;
  const maxHp = part.enemy_max_hp || 1;
  const currentHp = part.enemy_hp || 0;
  const def = part.enemy_defense || 0;
  const name = part.display_name;
  
  if (mode === "heal") {
    const newHp = Math.min(maxHp, currentHp + raw);
    const applied = newHp - currentHp;
    await (supabase as any).from("combat_participants")
      .update({ enemy_hp: newHp, is_defeated: newHp <= 0 })
      .eq("id", targetId);
    
    if (applied > 0 && !skipLogging) {
      await pushLog(campaignId, [
        { t: "text", v: `${name} ` },
        { t: "i18n", v: { key: "combat.heal" } as any } as any,
        { t: "text", v: `: ` },
        { t: "gain", v: `+${applied} HP` }
      ]);
    }
    return { raw, applied, def: 0, absorbed: 0, newHp, maxHp, defeated: false };
  }

  const useDefense = mode === "damageWithDefense";
  let damagePostDef = Math.max(0, raw - (useDefense ? def : 0));
  const totalMitigatedByDef = useDefense ? Math.min(raw, def) : 0;

  if (useDefense && damagePostDef === 0 && raw > 0 && !skipLogging) {
    await pushLog(campaignId, [
      { t: "i18n", v: { key: "combat.defenseBlockedMsg", params: { name, amount: raw, def } } as any } as any
    ]);
    return { raw, applied: 0, def: totalMitigatedByDef, absorbed: 0, newHp: currentHp, maxHp, defeated: false };
  }

  let absorbed = 0;
  let shieldBroke = false;

  if (mode !== "directDamage") {
    for (const sh of (shields || []) as any[]) {
      if (damagePostDef <= 0) break;
      const take = Math.min(sh.value || 0, damagePostDef);
      if (take <= 0) continue;
      
      absorbed += take;
      damagePostDef -= take;
      const nextValue = (sh.value || 0) - take;
      
      if (nextValue <= 0) {
        await (supabase as any).from("combat_temporary_effects").delete().eq("id", sh.id);
        shieldBroke = true;
        if (!skipLogging) {
          await pushLog(campaignId, [{ t: "i18n", v: { key: "combat.shieldBrokenMsg", params: { name } } as any } as any]);
        }
      } else {
        await (supabase as any).from("combat_temporary_effects").update({ value: nextValue }).eq("id", sh.id);
      }
    }
  }

  const applied = damagePostDef;
  const newHp = Math.max(0, currentHp - applied);
  const defeated = newHp <= 0 && currentHp > 0;
  
  await (supabase as any).from("combat_participants")
    .update({ enemy_hp: newHp, is_defeated: newHp <= 0 })
    .eq("id", targetId);

  // Logging
  const segments: any[] = [];
  if (sourceName) segments.push({ t: "text", v: `${sourceName} ` });
  if (skillName) segments.push({ t: "text", v: `(${skillName}) ` });
  
  if (mode === "directDamage") {
    segments.push({ t: "text", v: `${name} ` });
    segments.push({ t: "i18n", v: { key: "combat.directDamage" } as any } as any);
    segments.push({ t: "text", v: `: ` });
    segments.push({ t: "loss", v: `-${applied} HP` });
  } else {
    segments.push({ t: "text", v: `${name} ` });
    segments.push({ t: "i18n", v: { key: "combat.damageWithDefense" } as any } as any);
    segments.push({ t: "text", v: `: ` });
    segments.push({ t: "loss", v: `-${applied} HP` });
    if (totalMitigatedByDef > 0) segments.push({ t: "text", v: ` (DEF ${def} -${totalMitigatedByDef})` });
    if (absorbed > 0) segments.push({ t: "text", v: ` (🛡️ -${absorbed})` });
  }

  if (segments.length > 0 && !skipLogging) {
    await pushLog(campaignId, segments);
  }

  if (defeated && !skipLogging) {
    await pushLog(campaignId, [{ t: "text", v: `${name} fue derrotado.` }]);
  }

  return { raw, applied, def: totalMitigatedByDef, absorbed, newHp, maxHp, defeated, shieldBroke };
}

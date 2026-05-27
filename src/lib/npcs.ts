// NPC compendium — Phase 3.
// Separate library from Bestiary. NPCs are non-enemy characters (allies,
// neutrals, civilians, narrative entities) that can still be summoned into
// combat. In combat we reuse the `combat_participants` row layout used for
// enemies so the rest of the combat infrastructure (damage, skills, turns,
// effects, logs) works untouched — the only discriminator is
// `npc_template_id` being set.

import { supabase } from "@/integrations/supabase/client";
import { pushLog } from "@/lib/log";
import type { CombatEncounter } from "@/lib/combat";
import { clampInitiative } from "@/lib/combat";
import { IMMUNITIES, ROLE_OPTIONS, type EnemyRole, type SpawnPosition } from "@/lib/bestiary";

export type NpcDisposition = "ally" | "neutral" | "hostile";
export type NpcType =
  | "civilian" | "merchant" | "medic" | "guide" | "guard"
  | "ally" | "guest" | "summon" | "narrative" | "other";

export const NPC_TYPES: NpcType[] = [
  "civilian", "merchant", "medic", "guide", "guard",
  "ally", "guest", "summon", "narrative", "other",
];
export const NPC_DISPOSITIONS: NpcDisposition[] = ["ally", "neutral", "hostile"];
export { ROLE_OPTIONS, IMMUNITIES };
export type { EnemyRole, SpawnPosition };

export type NpcTemplate = {
  id: string;
  campaign_id: string;
  name: string;
  npc_type: NpcType;
  role: EnemyRole;
  biome: string | null;
  icon_key: string;
  color: string;
  max_hp: number;
  defense: number;
  speed: string;
  base_damage: string | null;
  description: string | null;
  personality: string | null;
  lore: string | null;
  service_notes: string | null;
  behavior_notes: string | null;
  weaknesses_text: string | null;
  immunities: string[];
  disposition: NpcDisposition;
  tier: string;
  is_boss: boolean;
  is_elite: boolean;
  created_by_character_id: string | null;
  image_url: string;
  image_offset_x: number;
  image_offset_y: number;
  image_scale: number;
  created_at: string;
  updated_at: string;
};

export type NpcTemplateSkill = {
  id: string;
  npc_template_id: string;
  campaign_id: string;
  name: string;
  rarity: "white" | "green" | "blue" | "purple" | "orange" | "red";
  skill_type: string | null;
  target_shape: string | null;
  targets: string | null;
  dice: string | null;
  range_text: string | null;
  effect: string | null;
  visual_brief: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export type NpcTemplateDraft = Omit<NpcTemplate, "id" | "created_at" | "updated_at" | "campaign_id">;
export type NpcTemplateSkillDraft = Omit<NpcTemplateSkill, "id" | "created_at" | "updated_at" | "campaign_id" | "npc_template_id">;

// ─────────────── CRUD: templates ───────────────

export async function listNpcTemplates(campaignId: string): Promise<NpcTemplate[]> {
  const { data, error } = await (supabase as any)
    .from("npc_templates")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("name", { ascending: true });
  if (error) return [];
  return (data as any) || [];
}

export async function listNpcTemplateSkills(templateId: string): Promise<NpcTemplateSkill[]> {
  const { data } = await (supabase as any)
    .from("npc_template_skills")
    .select("*")
    .eq("npc_template_id", templateId)
    .order("order_index", { ascending: true });
  return (data as any) || [];
}

export async function createNpcTemplate(
  campaignId: string,
  draft: NpcTemplateDraft,
  dm: { id: string; name: string; color: string },
) {
  const row = {
    campaign_id: campaignId,
    name: draft.name.trim(),
    npc_type: draft.npc_type,
    role: draft.role,
    biome: draft.biome,
    icon_key: draft.icon_key,
    color: draft.color,
    max_hp: Math.max(1, Math.floor(draft.max_hp)),
    defense: Math.max(0, Math.floor(draft.defense)),
    speed: draft.speed,
    base_damage: draft.base_damage,
    description: draft.description,
    personality: draft.personality,
    lore: draft.lore,
    service_notes: draft.service_notes,
    behavior_notes: draft.behavior_notes,
    weaknesses_text: draft.weaknesses_text,
    immunities: draft.immunities,
    disposition: draft.disposition,
    tier: draft.tier || "normal",
    is_boss: !!draft.is_boss,
    is_elite: !!draft.is_elite,
    created_by_character_id: dm.id,
    image_url: draft.image_url ?? "",
    image_offset_x: draft.image_offset_x ?? 50,
    image_offset_y: draft.image_offset_y ?? 50,
    image_scale: draft.image_scale ?? 1,
  };
  const { data, error } = await (supabase as any)
    .from("npc_templates")
    .insert(row)
    .select("*")
    .single();
  if (error || !data) return { ok: false as const, error: error?.message };
  await pushLog(campaignId, [
    { t: "char", v: dm.name, color: dm.color, id: dm.id },
    { t: "text", v: ` creó el NPC: ${row.name}.` },
  ], undefined, { dmOnly: true });
  return { ok: true as const, template: data as NpcTemplate };
}

export async function updateNpcTemplate(template: NpcTemplate, patch: Partial<NpcTemplateDraft>) {
  const upd: any = { ...patch };
  if (patch.name !== undefined) upd.name = patch.name.trim();
  if (patch.max_hp !== undefined) upd.max_hp = Math.max(1, Math.floor(patch.max_hp));
  if (patch.defense !== undefined) upd.defense = Math.max(0, Math.floor(patch.defense));
  const { error } = await (supabase as any)
    .from("npc_templates")
    .update(upd)
    .eq("id", template.id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function duplicateNpcTemplate(template: NpcTemplate, dm: { id: string; name: string; color: string }) {
  const skills = await listNpcTemplateSkills(template.id);
  const { data, error } = await (supabase as any)
    .from("npc_templates")
    .insert({
      campaign_id: template.campaign_id,
      name: `${template.name} (copia)`,
      npc_type: template.npc_type,
      role: template.role,
      biome: template.biome,
      icon_key: template.icon_key,
      color: template.color,
      max_hp: template.max_hp,
      defense: template.defense,
      speed: template.speed,
      base_damage: template.base_damage,
      description: template.description,
      personality: template.personality,
      lore: template.lore,
      service_notes: template.service_notes,
      behavior_notes: template.behavior_notes,
      weaknesses_text: template.weaknesses_text,
      immunities: template.immunities,
      disposition: template.disposition,
      tier: template.tier,
      is_boss: template.is_boss,
      is_elite: template.is_elite,
      created_by_character_id: dm.id,
      image_url: template.image_url ?? "",
      image_offset_x: template.image_offset_x ?? 50,
      image_offset_y: template.image_offset_y ?? 50,
      image_scale: template.image_scale ?? 1,
    })
    .select("*")
    .single();
  if (error || !data) return { ok: false as const, error: error?.message };
  if (skills.length) {
    const rows = skills.map(s => ({
      npc_template_id: (data as any).id,
      campaign_id: template.campaign_id,
      name: s.name, rarity: s.rarity, skill_type: s.skill_type, target_shape: s.target_shape,
      targets: s.targets, dice: s.dice, range_text: s.range_text, effect: s.effect,
      visual_brief: s.visual_brief, order_index: s.order_index,
    }));
    await (supabase as any).from("npc_template_skills").insert(rows);
  }
  return { ok: true as const, template: data as NpcTemplate };
}

export async function deleteNpcTemplate(template: NpcTemplate) {
  const { error } = await (supabase as any)
    .from("npc_templates")
    .delete()
    .eq("id", template.id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

// ─────────────── CRUD: template skills ───────────────

export async function addNpcTemplateSkill(template: NpcTemplate, draft: NpcTemplateSkillDraft) {
  const row = {
    npc_template_id: template.id,
    campaign_id: template.campaign_id,
    name: draft.name.trim(),
    rarity: draft.rarity || "white",
    skill_type: draft.skill_type,
    target_shape: draft.target_shape,
    targets: draft.targets,
    dice: draft.dice,
    range_text: draft.range_text,
    effect: draft.effect,
    visual_brief: draft.visual_brief,
    order_index: Math.max(0, Math.floor(draft.order_index)),
  };
  const { data, error } = await (supabase as any)
    .from("npc_template_skills")
    .insert(row)
    .select("*")
    .single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, skill: data as NpcTemplateSkill };
}

export async function updateNpcTemplateSkill(skill: NpcTemplateSkill, patch: Partial<NpcTemplateSkillDraft>) {
  const upd: any = { ...patch };
  if (patch.name !== undefined) upd.name = patch.name.trim();
  const { error } = await (supabase as any)
    .from("npc_template_skills")
    .update(upd)
    .eq("id", skill.id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function deleteNpcTemplateSkill(skill: NpcTemplateSkill) {
  const { error } = await (supabase as any)
    .from("npc_template_skills")
    .delete()
    .eq("id", skill.id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function reorderNpcTemplateSkill(skill: NpcTemplateSkill, direction: "up" | "down", siblings: NpcTemplateSkill[]) {
  const sorted = [...siblings].sort((a, b) => a.order_index - b.order_index);
  const idx = sorted.findIndex(s => s.id === skill.id);
  if (idx < 0) return;
  const target = direction === "up" ? idx - 1 : idx + 1;
  if (target < 0 || target >= sorted.length) return;
  const a = sorted[idx], b = sorted[target];
  await (supabase as any).from("npc_template_skills").update({ order_index: b.order_index }).eq("id", a.id);
  await (supabase as any).from("npc_template_skills").update({ order_index: a.order_index }).eq("id", b.id);
}

// ─────────────── Spawn into combat ───────────────

async function nextOrderIndex(encounterId: string): Promise<number> {
  const { data } = await (supabase as any)
    .from("combat_participants")
    .select("order_index")
    .eq("encounter_id", encounterId)
    .order("order_index", { ascending: false })
    .limit(1);
  const max = data && data[0] ? Number(data[0].order_index) : -1;
  return max + 1;
}

async function nextInstanceNumber(encounterId: string, baseName: string): Promise<number> {
  const { data } = await (supabase as any)
    .from("combat_participants")
    .select("enemy_instance_number")
    .eq("encounter_id", encounterId)
    .eq("enemy_name", baseName);
  const max = (data || []).reduce((acc: number, r: any) => Math.max(acc, Number(r.enemy_instance_number || 0)), 0);
  return max + 1;
}

export async function spawnNpcToCombat(
  template: NpcTemplate,
  encounter: CombatEncounter,
  options: { count: number; initiative: number; position: SpawnPosition; customName?: string | null },
  dm: { id: string; name: string; color: string },
) {
  if (encounter.status === "ended") return { ok: false as const, error: "ended" };
  const qty = Math.max(1, Math.min(20, Math.floor(options.count || 1)));
  const initiative = clampInitiative(options.initiative || 10);
  const baseName = (options.customName?.trim()) || template.name;
  let baseOrder = await nextOrderIndex(encounter.id);
  if (options.position === "afterCurrent" && encounter.status === "active") {
    const { data: ordered } = await (supabase as any)
      .from("combat_participants")
      .select("id, order_index")
      .eq("encounter_id", encounter.id)
      .order("order_index", { ascending: true });
    const list = (ordered || []) as Array<{ id: string; order_index: number }>;
    const currentIdx = Math.max(0, Math.min(list.length - 1, encounter.current_turn_index));
    const currentRow = list[currentIdx];
    const insertAfter = currentRow ? Number(currentRow.order_index) : -1;
    baseOrder = insertAfter + 1;
    const toShift = list.filter((r) => Number(r.order_index) > insertAfter);
    for (const r of toShift) {
      await (supabase as any)
        .from("combat_participants")
        .update({ order_index: Number(r.order_index) + qty })
        .eq("id", r.id);
    }
  }
  const startInstance = await nextInstanceNumber(encounter.id, baseName);
  const rows: any[] = [];
  for (let i = 0; i < qty; i++) {
    const instance = startInstance + i;
    rows.push({
      encounter_id: encounter.id,
      campaign_id: encounter.campaign_id,
      character_id: null,
      // Reuse the enemy participant pipeline; npc_template_id discriminates NPCs in UI.
      participant_type: "enemy",
      display_name: qty > 1 || instance > 1 ? `${baseName} ${instance}` : baseName,
      image_url: template.image_url || null,
      enemy_image_offset_x: template.image_offset_x ?? 50,
      enemy_image_offset_y: template.image_offset_y ?? 50,
      enemy_image_scale: template.image_scale ?? 1,
      color: template.color,
      initiative,
      order_index: baseOrder + i,
      enemy_name: baseName,
      enemy_icon: template.icon_key,
      enemy_color: template.color,
      enemy_hp: template.max_hp,
      enemy_max_hp: template.max_hp,
      enemy_defense: template.defense,
      enemy_speed: template.speed,
      enemy_notes: template.base_damage ? `Daño base: ${template.base_damage}` : null,
      enemy_instance_number: instance,
      enemy_template_id: null,
      npc_template_id: template.id,
      npc_disposition: template.disposition,
      is_enemy_visible: true,
      is_defeated: false,
    });
  }
  const { data: inserted, error } = await (supabase as any)
    .from("combat_participants").insert(rows).select("id");
  if (error) return { ok: false as const, error: error.message };

  // Snapshot skills into combat_enemy_skills (source_kind='npc') so the
  // existing EnemySkillUseModal flow works untouched.
  const skills = await listNpcTemplateSkills(template.id);
  if (skills.length && inserted && inserted.length) {
    const skillRows: any[] = [];
    for (const p of inserted) {
      for (const s of skills) {
        skillRows.push({
          campaign_id: encounter.campaign_id,
          encounter_id: encounter.id,
          combat_participant_id: p.id,
          template_skill_id: null,
          source_kind: "npc",
          npc_template_id: template.id,
          name: s.name,
          rarity: s.rarity,
          skill_type: s.skill_type,
          target_shape: s.target_shape,
          targets: s.targets,
          dice: s.dice,
          range_text: s.range_text,
          effect: s.effect,
          visual_brief: s.visual_brief,
          order_index: s.order_index,
        });
      }
    }
    await (supabase as any).from("combat_enemy_skills").insert(skillRows);
  }

  await pushLog(encounter.campaign_id, [
    { t: "char", v: dm.name, color: dm.color, id: dm.id },
    { t: "text", v: ` añadió ${qty > 1 ? `${qty} ` : ""}${baseName}${qty > 1 ? "s" : ""} (NPC) al combate.` },
  ]);
  return { ok: true as const };
}

export async function loadNpcTemplate(templateId: string): Promise<NpcTemplate | null> {
  const { data } = await (supabase as any)
    .from("npc_templates").select("*").eq("id", templateId).maybeSingle();
  return (data as any) || null;
}

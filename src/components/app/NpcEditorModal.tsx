import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUp, ArrowDown, Edit3 } from "lucide-react";
import {
  type NpcTemplate, type NpcTemplateDraft, type NpcTemplateSkill, type NpcTemplateSkillDraft,
  NPC_TYPES, NPC_DISPOSITIONS, ROLE_OPTIONS, IMMUNITIES,
  createNpcTemplate, updateNpcTemplate,
  listNpcTemplateSkills, addNpcTemplateSkill, updateNpcTemplateSkill,
  deleteNpcTemplateSkill, reorderNpcTemplateSkill,
} from "@/lib/npcs";
import { BIOME_PRESETS, SKILL_TYPES, SKILL_SHAPES } from "@/lib/bestiary";
import { EnemyIconPicker, EnemyColorPicker, ENEMY_COLORS, getEnemyAssetUrl } from "@/components/app/EnemyIconPicker";
import { EnemyImageEditor, type EnemyImageState } from "@/components/app/EnemyImageEditor";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";
import { backdropProps } from "@/lib/modalBackdrop";

type Props = {
  campaignId: string;
  dm: { id: string; name: string; color: string };
  editing?: NpcTemplate | null;
  onClose: () => void;
  onSaved?: (t: NpcTemplate) => void;
};

const RARITIES = ["white", "blue", "purple", "gold"] as const;
const CUSTOM_BIOME = "__custom__";

type LocalSkill = NpcTemplateSkillDraft & { id: string; _isLocal?: boolean };

export function NpcEditorModal({ campaignId, dm, editing, onClose, onSaved }: Props) {
  const { t } = useT();
  const isEdit = !!editing;

  const [name, setName] = useState(editing?.name || "");
  const [npcType, setNpcType] = useState<string>(editing?.npc_type || "civilian");
  const [role, setRole] = useState<string>(editing?.role || "support");
  const [disposition, setDisposition] = useState<string>(editing?.disposition || "neutral");

  const initialBiome = editing?.biome || "";
  const isPreset = BIOME_PRESETS.includes(initialBiome);
  const [biomeChoice, setBiomeChoice] = useState<string>(
    initialBiome ? (isPreset ? initialBiome : CUSTOM_BIOME) : "",
  );
  const [biomeCustom, setBiomeCustom] = useState(isPreset ? "" : initialBiome);

  const [icon, setIcon] = useState(editing?.icon_key || "user");
  const [color, setColor] = useState(editing?.color || ENEMY_COLORS[0]);
  const [maxHp, setMaxHp] = useState(editing?.max_hp ?? 15);
  const [defense, setDefense] = useState(editing?.defense ?? 0);
  const [speed, setSpeed] = useState(editing?.speed || "30");
  const [baseDamage, setBaseDamage] = useState(editing?.base_damage || "");
  const [description, setDescription] = useState(editing?.description || "");
  const [personality, setPersonality] = useState(editing?.personality || "");
  const [lore, setLore] = useState(editing?.lore || "");
  const [serviceNotes, setServiceNotes] = useState(editing?.service_notes || "");
  const [behavior, setBehavior] = useState(editing?.behavior_notes || "");
  const [weaknesses, setWeaknesses] = useState(editing?.weaknesses_text || "");
  const [immunities, setImmunities] = useState<string[]>(editing?.immunities || []);
  const [image, setImage] = useState<EnemyImageState>({
    url: editing?.image_url || "",
    offsetX: Number(editing?.image_offset_x ?? 50),
    offsetY: Number(editing?.image_offset_y ?? 50),
    scale: Number(editing?.image_scale ?? 1),
  });
  const [busy, setBusy] = useState(false);

  const [savedSkills, setSavedSkills] = useState<NpcTemplateSkill[]>([]);
  const [localSkills, setLocalSkills] = useState<LocalSkill[]>([]);
  const [editingSkill, setEditingSkill] = useState<NpcTemplateSkill | LocalSkill | null>(null);
  const [addingSkill, setAddingSkill] = useState(false);
  const [confirmDeleteSkill, setConfirmDeleteSkill] = useState<NpcTemplateSkill | LocalSkill | null>(null);

  useEffect(() => {
    if (editing) listNpcTemplateSkills(editing.id).then(setSavedSkills);
  }, [editing?.id]);

  const toggleImmunity = (k: string) => {
    setImmunities(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  };
  const resolvedBiome = useMemo(() => {
    if (!biomeChoice) return null;
    if (biomeChoice === CUSTOM_BIOME) return biomeCustom.trim() || null;
    return biomeChoice;
  }, [biomeChoice, biomeCustom]);

  const buildDraft = (): NpcTemplateDraft => ({
    name: name.trim(),
    npc_type: npcType as any,
    role: role as any,
    biome: resolvedBiome,
    icon_key: icon,
    color,
    max_hp: maxHp,
    defense,
    speed,
    base_damage: baseDamage.trim() || null,
    description: description.trim() || null,
    personality: personality.trim() || null,
    lore: lore.trim() || null,
    service_notes: serviceNotes.trim() || null,
    behavior_notes: behavior.trim() || null,
    weaknesses_text: weaknesses.trim() || null,
    immunities,
    disposition: disposition as any,
    tier: "normal",
    is_boss: false,
    is_elite: false,
    created_by_character_id: dm.id,
    image_url: image.url || "",
    image_offset_x: image.offsetX,
    image_offset_y: image.offsetY,
    image_scale: image.scale,
  });

  const allSkills = useMemo<Array<NpcTemplateSkill | LocalSkill>>(
    () => [...savedSkills, ...localSkills].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    [savedSkills, localSkills],
  );
  const reloadSavedSkills = async (tplId: string) => setSavedSkills(await listNpcTemplateSkills(tplId));

  const handleSkillUpsert = (draft: NpcTemplateSkillDraft, existing: NpcTemplateSkill | LocalSkill | null) => {
    if (!editing) {
      if (existing && (existing as LocalSkill)._isLocal) {
        setLocalSkills(prev => prev.map(s => (s.id === existing.id ? { ...s, ...draft } : s)));
      } else {
        const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        setLocalSkills(prev => [...prev, { id, _isLocal: true, ...draft }]);
      }
    }
  };

  const submit = async () => {
    if (!name.trim()) { toast.error(t("npcs.errName")); return; }
    if (maxHp <= 0) { toast.error(t("npcs.errHp")); return; }
    if (defense < 0) { toast.error(t("npcs.errDef")); return; }
    if (biomeChoice === CUSTOM_BIOME && !biomeCustom.trim()) { toast.error(t("bestiary.errCustomBiome")); return; }
    setBusy(true);
    const draft = buildDraft();
    if (isEdit && editing) {
      const r = await updateNpcTemplate(editing, draft);
      if (!r.ok) { toast.error(t("npcs.saveError")); setBusy(false); return; }
      toast.success(t("npcs.saved"));
      onSaved?.(editing);
      setBusy(false); onClose();
    } else {
      const r = await createNpcTemplate(campaignId, draft, dm);
      if (!r.ok) { toast.error(t("npcs.saveError")); setBusy(false); return; }
      let failed = 0;
      for (let i = 0; i < localSkills.length; i++) {
        const s = localSkills[i];
        const { id: _id, _isLocal: _l, ...payload } = s;
        const res = await addNpcTemplateSkill(r.template, { ...payload, order_index: i });
        if (!res.ok) failed++;
      }
      if (failed > 0) { toast.error(t("npcs.skillsPartial")); setBusy(false); return; }
      toast.success(t("npcs.saved"));
      onSaved?.(r.template);
      setBusy(false); onClose();
    }
  };

  const handleConfirmDeleteSkill = async () => {
    const s = confirmDeleteSkill;
    if (!s) return;
    if ((s as LocalSkill)._isLocal) {
      setLocalSkills(prev => prev.filter(x => x.id !== s.id));
    } else {
      await deleteNpcTemplateSkill(s as NpcTemplateSkill);
      if (editing) reloadSavedSkills(editing.id);
    }
    setConfirmDeleteSkill(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3" {...backdropProps(onClose)}>
      <div className="ornate-card max-w-2xl w-full max-h-[92vh] overflow-y-auto p-4 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-[var(--gold)] text-base uppercase tracking-widest">
            {isEdit ? t("npcs.editNpc") : t("npcs.createNpc")}
          </h3>
          <button className="text-muted-foreground" onClick={onClose}>✕</button>
        </div>

        <Section title={t("npcs.sectionIdentity")}>
          <Field label={t("npcs.name")}><Input value={name} onChange={setName} maxLength={80} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("npcs.npcType")}>
              <Select value={npcType} onChange={setNpcType} options={NPC_TYPES.map(v => [v, t(`npcs.type_${v}`)])} />
            </Field>
            <Field label={t("bestiary.role")}>
              <Select value={role} onChange={setRole} options={ROLE_OPTIONS.map(v => [v, t(`bestiary.role_${v}`)])} />
            </Field>
            <Field label={t("npcs.disposition")}>
              <Select value={disposition} onChange={setDisposition} options={NPC_DISPOSITIONS.map(v => [v, t(`npcs.disp_${v}`)])} />
            </Field>
            <Field label={t("bestiary.biome")}>
              <Select value={biomeChoice} onChange={setBiomeChoice}
                options={[
                  ["", t("bestiary.biomeNone")],
                  ...BIOME_PRESETS.map(b => [b, b] as [string, string]),
                  [CUSTOM_BIOME, t("bestiary.addAnotherRegion")],
                ]} />
            </Field>
            <div className="flex items-end col-span-2">
              {biomeChoice === CUSTOM_BIOME && (
                <Input value={biomeCustom} onChange={setBiomeCustom} placeholder={t("bestiary.customRegion")} />
              )}
            </div>
          </div>
          <Field label={t("combat.icon")}><EnemyIconPicker value={icon} onChange={setIcon} /></Field>
          {/* NOTE: do NOT wrap the image editor in <Field> (which renders a <label>).
              Any click on a label-wrapped block forwards the click to the first
              form control inside it — that's the hidden file input — so clicking
              sliders, the preview, or releasing a drag would open the file picker. */}
          <div className="block space-y-1">
            <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{t("bestiary.customImage")}</span>
            <EnemyImageEditor value={image} onChange={setImage}
              fallbackUrl={getEnemyAssetUrl(icon)} storageKey={`npc/${campaignId}`} />
          </div>
          <Field label={t("combat.color")}><EnemyColorPicker value={color} onChange={setColor} /></Field>
        </Section>

        <Section title={t("bestiary.sectionStats")}>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("bestiary.maxHp")}>
              <Input type="number" value={String(maxHp)} onChange={v => setMaxHp(parseInt(v) || 0)} />
            </Field>
            <Field label={t("bestiary.defense")}>
              <Input type="number" value={String(defense)} onChange={v => setDefense(parseInt(v) || 0)} />
            </Field>
            <Field label={t("bestiary.speed")}><Input value={speed} onChange={setSpeed} /></Field>
            <Field label={t("bestiary.baseDamage")}><Input value={baseDamage} onChange={setBaseDamage} placeholder="1d6 + mod" /></Field>
          </div>
        </Section>

        <Section title={t("npcs.sectionNarrative")}>
          <Field label={t("bestiary.description")}>
            <textarea className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1.5 text-sm" rows={2}
              value={description} onChange={e => setDescription(e.target.value)} />
          </Field>
          <Field label={t("npcs.personality")}>
            <textarea className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1.5 text-sm" rows={2}
              value={personality} onChange={e => setPersonality(e.target.value)} />
          </Field>
          <Field label={t("npcs.lore")}>
            <textarea className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1.5 text-sm" rows={2}
              value={lore} onChange={e => setLore(e.target.value)} />
          </Field>
          <Field label={t("npcs.serviceNotes")}>
            <textarea className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1.5 text-sm" rows={2}
              value={serviceNotes} onChange={e => setServiceNotes(e.target.value)} />
          </Field>
          <Field label={t("npcs.combatBehavior")}>
            <textarea className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1.5 text-sm" rows={2}
              value={behavior} onChange={e => setBehavior(e.target.value)} />
          </Field>
        </Section>

        <Section title={t("bestiary.sectionImmunities")}>
          <Field label={t("bestiary.immunities")}>
            <div className="flex flex-wrap gap-1">
              {IMMUNITIES.map(k => {
                const on = immunities.includes(k);
                return (
                  <button key={k} type="button" onClick={() => toggleImmunity(k)}
                    className={`text-[10px] px-2 py-1 rounded-md border ${on ? "bg-[var(--gold)]/20 border-[var(--gold)] text-[var(--gold)]" : "border-border text-foreground"}`}>
                    {t(`bestiary.immunity_${k}`)}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label={t("bestiary.weaknesses")}>
            <textarea className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1.5 text-sm" rows={2}
              value={weaknesses} onChange={e => setWeaknesses(e.target.value)} />
          </Field>
        </Section>

        <Section title={t("npcs.sectionSkills")}>
          <div className="space-y-1.5">
            {allSkills.length === 0 && <p className="text-xs text-muted-foreground">{t("bestiary.noSkills")}</p>}
            {allSkills.map((s, i) => {
              const isLocal = (s as LocalSkill)._isLocal;
              const saved = !isLocal ? (s as NpcTemplateSkill) : null;
              return (
                <div key={s.id} className="bg-secondary/40 rounded p-2 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-display truncate">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {s.skill_type ? t(`bestiary.skillType_${s.skill_type}`) : "—"} · {s.dice || "—"}
                    </p>
                  </div>
                  {saved && (
                    <>
                      <button className="text-muted-foreground" onClick={async () => { await reorderNpcTemplateSkill(saved, "up", savedSkills); if (editing) reloadSavedSkills(editing.id); }} disabled={i === 0}><ArrowUp size={14} /></button>
                      <button className="text-muted-foreground" onClick={async () => { await reorderNpcTemplateSkill(saved, "down", savedSkills); if (editing) reloadSavedSkills(editing.id); }} disabled={i === allSkills.length - 1}><ArrowDown size={14} /></button>
                    </>
                  )}
                  <button className="text-muted-foreground" onClick={() => setEditingSkill(s)}><Edit3 size={14} /></button>
                  <button className="text-destructive" onClick={() => setConfirmDeleteSkill(s)}><Trash2 size={14} /></button>
                </div>
              );
            })}
            <button className="btn-fantasy w-full text-xs" onClick={() => setAddingSkill(true)}>
              <Plus size={12} className="inline mr-1" /> {t("bestiary.addSkill")}
            </button>
          </div>
          {(addingSkill || editingSkill) && (
            <SkillEditor
              template={editing || null}
              editing={editingSkill}
              nextOrder={allSkills.length}
              onClose={() => { setAddingSkill(false); setEditingSkill(null); }}
              onLocalSave={(draft) => handleSkillUpsert(draft, editingSkill)}
              onSavedRefresh={() => editing && reloadSavedSkills(editing.id)}
            />
          )}
        </Section>

        <div className="grid grid-cols-2 gap-2 pt-2 sticky bottom-0 bg-card/95 -mx-4 px-4 py-2 border-t border-border">
          <button className="btn-fantasy" onClick={onClose} disabled={busy}>{t("common.cancel")}</button>
          <button className="btn-fantasy" disabled={busy}
            style={{ background: "var(--gradient-gold)", color: "oklch(0.15 0.03 25)" }}
            onClick={submit}>
            {isEdit ? t("common.save") : t("npcs.createNpc")}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDeleteSkill}
        title={t("bestiary.confirmDeleteSkillTitle")}
        description={t("bestiary.confirmDeleteSkill")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onConfirm={handleConfirmDeleteSkill}
        onCancel={() => setConfirmDeleteSkill(null)}
      />
    </div>
  );
}

function SkillEditor({
  template, editing, nextOrder, onClose, onLocalSave, onSavedRefresh,
}: {
  template: NpcTemplate | null;
  editing: NpcTemplateSkill | LocalSkill | null;
  nextOrder: number;
  onClose: () => void;
  onLocalSave: (draft: NpcTemplateSkillDraft) => void;
  onSavedRefresh: () => void;
}) {
  const { t } = useT();
  const [name, setName] = useState(editing?.name || "");
  const [rarity, setRarity] = useState<NpcTemplateSkill["rarity"]>((editing?.rarity as any) || "white");
  const [skillType, setSkillType] = useState(editing?.skill_type || "impact");
  const [shape, setShape] = useState(editing?.target_shape || "point");
  const [targets, setTargets] = useState(editing?.targets || "");
  const [dice, setDice] = useState(editing?.dice || "");
  const [rangeText, setRangeText] = useState(editing?.range_text || "");
  const [effect, setEffect] = useState(editing?.effect || "");
  const [visual, setVisual] = useState(editing?.visual_brief || "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) { toast.error(t("bestiary.errSkillName")); return; }
    setBusy(true);
    const draft: NpcTemplateSkillDraft = {
      name: name.trim(),
      rarity,
      skill_type: skillType,
      target_shape: shape,
      targets: targets.trim() || null,
      dice: dice.trim() || null,
      range_text: rangeText.trim() || null,
      effect: effect.trim() || null,
      visual_brief: visual.trim() || null,
      order_index: (editing as any)?.order_index ?? nextOrder,
    };
    const isLocalEdit = editing && (editing as LocalSkill)._isLocal;
    if (!template || isLocalEdit) {
      onLocalSave(draft);
      setBusy(false); onClose(); return;
    }
    const saved = editing as NpcTemplateSkill;
    const r = editing
      ? await updateNpcTemplateSkill(saved, draft)
      : await addNpcTemplateSkill(template, draft);
    setBusy(false);
    if (!r.ok) { toast.error(t("npcs.saveError")); return; }
    onSavedRefresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-3" {...backdropProps(onClose)}>
      <div className="ornate-card max-w-md w-full max-h-[90vh] overflow-y-auto p-4 space-y-2" onClick={e => e.stopPropagation()}>
        <h4 className="font-display text-[var(--gold)] text-sm uppercase tracking-widest">
          {editing ? t("bestiary.editSkill") : t("bestiary.addSkill")}
        </h4>
        <Field label={t("bestiary.name")}><Input value={name} onChange={setName} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("bestiary.rarity")}>
            <Select value={rarity} onChange={(v: any) => setRarity(v)} options={RARITIES.map(r => [r, r])} />
          </Field>
          <Field label={t("bestiary.skillType")}>
            <Select value={skillType} onChange={setSkillType} options={SKILL_TYPES.map(v => [v, t(`bestiary.skillType_${v}`)])} />
          </Field>
          <Field label={t("bestiary.castShape")}>
            <Select value={shape} onChange={setShape} options={SKILL_SHAPES.map(v => [v, t(`bestiary.shape_${v}`)])} />
          </Field>
          <Field label={t("bestiary.targets")}><Input value={targets} onChange={setTargets} placeholder="[Usuario]" /></Field>
          <Field label={t("bestiary.dice")}><Input value={dice} onChange={setDice} placeholder="1d6" /></Field>
          <Field label={t("bestiary.range")}><Input value={rangeText} onChange={setRangeText} placeholder="[MELEE]" /></Field>
        </div>
        <Field label={t("bestiary.effect")}>
          <textarea className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1.5 text-sm" rows={2}
            value={effect} onChange={e => setEffect(e.target.value)} />
        </Field>
        <Field label={t("bestiary.visualBrief")}><Input value={visual} onChange={setVisual} /></Field>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button className="btn-fantasy" onClick={onClose} disabled={busy}>{t("common.cancel")}</button>
          <button className="btn-fantasy" disabled={busy}
            style={{ background: "var(--gradient-gold)", color: "oklch(0.15 0.03 25)" }}
            onClick={submit}>{t("common.save")}</button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 border-t border-border/50 pt-3">
      <p className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
function Input({ value, onChange, type = "text", maxLength, placeholder }: {
  value: string; onChange: (v: string) => void; type?: string; maxLength?: number; placeholder?: string;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} maxLength={maxLength} placeholder={placeholder}
      className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1.5 outline-none focus:border-[var(--gold)] text-sm" />
  );
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Array<[string, string]> }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1.5 outline-none focus:border-[var(--gold)] text-sm">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

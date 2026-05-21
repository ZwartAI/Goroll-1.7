import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { Upload, X, AlertTriangle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parseEnemyFile, type EnemyImportResult, type ImportedEnemy, type DuplicateMode } from "@/lib/enemyImport";
import type { EnemyTemplate } from "@/lib/bestiary";

type Props = {
  campaignId: string;
  dm: { id: string; name: string; color: string };
  existing: EnemyTemplate[];
  onClose: () => void;
  onImported?: () => void;
};

export function EnemyExcelImportModal({ campaignId, dm, existing, onClose, onImported }: Props) {
  const { t } = useT();
  const [parsed, setParsed] = useState<EnemyImportResult | null>(null);
  const [modeByKey, setModeByKey] = useState<Record<string, DuplicateMode>>({});
  const [busy, setBusy] = useState(false);

  const existingByName = useMemo(() => {
    const m = new Map<string, EnemyTemplate>();
    for (const e of existing) m.set(e.name.trim().toLowerCase(), e);
    return m;
  }, [existing]);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const res = await parseEnemyFile(file);
      setParsed(res);
      const defaults: Record<string, DuplicateMode> = {};
      for (const en of res.enemies) {
        if (existingByName.has(en.name.trim().toLowerCase())) defaults[en.key] = "skip";
      }
      setModeByKey(defaults);
    } catch (e: any) {
      toast.error(e?.message || "Excel error");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!parsed || busy) return;
    setBusy(true);
    let created = 0, updated = 0, skipped = 0, skillsTotal = 0;
    for (const en of parsed.enemies) {
      const dup = existingByName.get(en.name.trim().toLowerCase());
      const mode: DuplicateMode = dup ? (modeByKey[en.key] || "skip") : "create";
      if (dup && mode === "skip") { skipped++; continue; }
      const payload = {
        campaign_id: campaignId,
        name: dup && mode === "create" ? `${en.name} (importado)` : en.name,
        tier: en.tier,
        role: en.role,
        biome: en.biome,
        icon_key: en.icon_key,
        color: en.color,
        max_hp: en.max_hp,
        defense: en.defense,
        speed: en.speed,
        base_damage: en.base_damage,
        description: en.description,
        behavior_notes: en.behavior_notes,
        weaknesses_text: en.weaknesses_text,
        immunities: en.immunities,
        is_boss: en.tier === "boss" || en.tier === "god",
        is_elite: en.tier === "elite",
        created_by_character_id: dm.id,
      };
      let tplId: string | null = null;
      if (dup && mode === "update") {
        const { error } = await (supabase as any).from("enemy_templates").update(payload).eq("id", dup.id);
        if (error) { toast.error(`${en.name}: ${error.message}`); continue; }
        tplId = dup.id;
        // Replace skills.
        await (supabase as any).from("enemy_template_skills").delete().eq("enemy_template_id", tplId);
        updated++;
      } else {
        const { data, error } = await (supabase as any).from("enemy_templates").insert(payload).select("id").single();
        if (error || !data) { toast.error(`${en.name}: ${error?.message || "insert"}`); continue; }
        tplId = (data as any).id;
        created++;
      }
      if (en.skills.length && tplId) {
        const rows = en.skills.map((s, i) => ({
          enemy_template_id: tplId,
          campaign_id: campaignId,
          name: s.name,
          rarity: s.rarity,
          skill_type: s.skill_type,
          target_shape: s.target_shape,
          targets: s.targets,
          dice: s.dice,
          range_text: s.range_text,
          effect: s.effect,
          visual_brief: s.visual_brief,
          order_index: s.order_index ?? i,
        }));
        const { error: se } = await (supabase as any).from("enemy_template_skills").insert(rows);
        if (!se) skillsTotal += rows.length;
      }
    }
    setBusy(false);
    toast.success(t("bestiary.importDoneToast", { c: created, u: updated, s: skipped, k: skillsTotal }));
    onImported?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-3" onClick={onClose}>
      <div className="ornate-card max-w-2xl w-full max-h-[92vh] overflow-y-auto p-4 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-[var(--gold)] text-base uppercase tracking-widest">
            {t("bestiary.importEnemyExcel")}
          </h3>
          <button className="text-muted-foreground" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="text-[11px] text-muted-foreground flex items-start gap-1">
          <Info size={12} className="mt-0.5 shrink-0" /> {t("bestiary.excelNotStored")}
        </p>

        {!parsed && (
          <label className="btn-fantasy w-full flex items-center justify-center gap-2 cursor-pointer"
            style={{ background: "var(--gradient-gold)", color: "oklch(0.15 0.03 25)" }}>
            <Upload size={14} />
            {busy ? t("common.loading") : t("bestiary.selectExcelFile")}
            <input type="file" accept=".xlsx,.xls" className="hidden" disabled={busy}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          </label>
        )}

        {parsed && (
          <>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <Stat label={t("bestiary.detectedEnemies")} value={parsed.enemies.length} />
              <Stat label={t("bestiary.detectedSkills")} value={parsed.totalSkills} />
              <Stat label={t("bestiary.warnings")} value={parsed.warnings.length} />
            </div>

            {parsed.errors.length > 0 && (
              <div className="bg-destructive/15 border border-destructive/40 rounded p-2 text-xs space-y-1">
                {parsed.errors.map((e, i) => <p key={i}><b>{e.where}:</b> {e.message}</p>)}
              </div>
            )}
            {parsed.warnings.length > 0 && (
              <details className="bg-secondary/40 rounded p-2 text-[11px]">
                <summary className="cursor-pointer text-muted-foreground flex items-center gap-1">
                  <AlertTriangle size={12} /> {parsed.warnings.length} {t("bestiary.warnings").toLowerCase()}
                </summary>
                <ul className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
                  {parsed.warnings.map((w, i) => <li key={i}><b>{w.where}:</b> {w.message}</li>)}
                </ul>
              </details>
            )}

            <div className="space-y-1 max-h-[50vh] overflow-y-auto">
              {parsed.enemies.map(en => (
                <EnemyRow key={en.key} en={en}
                  dup={!!existingByName.get(en.name.trim().toLowerCase())}
                  mode={modeByKey[en.key] || (existingByName.get(en.name.trim().toLowerCase()) ? "skip" : "create")}
                  onMode={m => setModeByKey(prev => ({ ...prev, [en.key]: m }))} />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
              <button className="btn-fantasy" onClick={onClose} disabled={busy}>{t("common.cancel")}</button>
              <button className="btn-fantasy" disabled={busy || parsed.enemies.length === 0}
                style={{ background: "var(--gradient-gold)", color: "oklch(0.15 0.03 25)" }}
                onClick={confirm}>
                {t("bestiary.confirmImport")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="ornate-card p-2">
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-display text-lg text-[var(--gold)]">{value}</p>
    </div>
  );
}

function EnemyRow({ en, dup, mode, onMode }: {
  en: ImportedEnemy; dup: boolean; mode: DuplicateMode; onMode: (m: DuplicateMode) => void;
}) {
  const { t } = useT();
  return (
    <div className="bg-secondary/40 rounded p-2 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-display truncate" style={{ color: en.color }}>{en.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {t(`bestiary.tier_${en.tier}`)} · HP {en.max_hp} · DEF {en.defense}
          {en.skills.length > 0 && ` · ${en.skills.length} skills`}
          {en.tierMissing && ` · ⚠ ${t("bestiary.tierUnknown")}`}
          {en.iconAuto && ` · ${t("bestiary.iconAuto")}`}
          {en.biomeUnknown && ` · ⚠ ${en.biome}`}
        </p>
      </div>
      {dup && (
        <select value={mode} onChange={e => onMode(e.target.value as DuplicateMode)}
          className="bg-card border border-border rounded text-[10px] px-1 py-0.5">
          <option value="skip">{t("bestiary.dupSkip")}</option>
          <option value="update">{t("bestiary.dupUpdate")}</option>
          <option value="create">{t("bestiary.dupCreate")}</option>
        </select>
      )}
    </div>
  );
}

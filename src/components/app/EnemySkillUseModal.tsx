import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import {
  logEnemySkillUse,
  type CombatEnemySkill,
  type CombatParticipant,
  type EnemySkillVisibility,
} from "@/lib/combat";
import { resolveDamageAgainstEntity } from "@/lib/combat-logic";

import { EnemyIcon, getEnemyAssetUrl, getEnemyCustomImage } from "@/components/app/EnemyIconPicker";
import { StatText } from "@/components/app/StatText";
import { NumberInput } from "@/components/app/NumberInput";
import { backdropProps } from "@/lib/modalBackdrop";
import { useGameData } from "@/lib/CampaignProvider";
import { useEncounterShields } from "@/hooks/useEncounterShields";

type DamageMode = "individual" | "direct" | "split" | "logOnly";

export function EnemySkillUseModal({
  participant,
  skill,
  onClose,
  onConfirmed,
  initialResolvedTargets,
  initialRollResult,
  initialSelectedCharIds,
  initialDistribution,
  skipDamageApplication,
}: {
  participant: CombatParticipant;
  skill: CombatEnemySkill;
  onClose: () => void;
  onConfirmed?: () => void;
  initialResolvedTargets?: string;
  initialRollResult?: number;
  initialSelectedCharIds?: string[];
  initialDistribution?: DamageMode;
  skipDamageApplication?: boolean;
}) {
  const { t } = useT();
  const { characters, combat } = useGameData();
  const encounterId = combat.encounter?.id ?? null;
  const { byCharacter: shieldsByChar } = useEncounterShields(encounterId);

  const participants = combat.participants;
  const sourceId = participant.id;
  const possibleTargets = participants.filter(p => p.id !== sourceId);

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set((initialSelectedCharIds || []).filter(id => participants.some(p => p.id === id || p.character_id === id)))
  );
  const [rollResult, setRollResult] = useState<number>(initialRollResult ?? 0);
  const [mode, setMode] = useState<DamageMode>(
    skipDamageApplication ? "logOnly" : (initialDistribution ?? "individual")
  );
  const [includeLink, setIncludeLink] = useState(false);
  const [dmNote, setDmNote] = useState("");
  const [visibility, setVisibility] = useState<EnemySkillVisibility>(() => {
    if (combat.encounter?.combat_log_detail_mode === "dm_private") return "private";
    if (combat.encounter?.combat_log_detail_mode === "minimal") return "nameAndEffect";
    return "full";
  });
  const [busy, setBusy] = useState(false);

  const color = participant.enemy_color || "var(--loss)";
  const selectedArr = useMemo(() => Array.from(selected), [selected]);

  const anySelectedLinked = selectedArr.some(id => {
    const p = participants.find(pp => pp.id === id || pp.character_id === id);
    return !!p?.turn_group_id;
  });

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(possibleTargets.map(p => p.character_id || p.id)));
  const clearAll = () => setSelected(new Set());

  const submit = async () => {
    if (participant.is_defeated) {
      if (!confirm(t("combat.enemy.defeatedWarn"))) return;
    }

    setBusy(true);

    let resolvedTargetsLabel = initialResolvedTargets || "";
    let damageOk = true;

    if (mode !== "logOnly" && !skipDamageApplication) {
      if (!Number.isFinite(rollResult) || rollResult <= 0) {
        toast.error(t("combat.enemy.errNoRoll"));
        setBusy(false);
        return;
      }
      if (selected.size === 0) {
        toast.error(t("combat.enemy.errNoTargets"));
        setBusy(false);
        return;
      }

      let results: any[] = [];
      const distributionMode = mode === "split" && selected.size > 1 ? "split" : "individual";
      
      for (const targetId of selectedArr) {
        const targetPart = participants.find(p => p.id === targetId || p.character_id === targetId);
        if (!targetPart) continue;

        let amount = rollResult;
        if (distributionMode === "split") {
          amount = Math.floor(rollResult / selected.size);
        }
        
        const r = await resolveDamageAgainstEntity({
          targetId: targetPart.character_id || targetPart.id,
          targetType: targetPart.participant_type === "player" ? "character" : "enemy",
          encounterId: encounterId!,
          campaignId: combat.encounter?.campaign_id!,
          amount,
          mode: mode === "direct" ? "directDamage" : "damageWithDefense",
          sourceName: participant.display_name,
          skillName: skill.name,
          skipLogging: true
        });
        
        if (r) results.push({ name: targetPart.display_name });
      }

      resolvedTargetsLabel = results.map(x => x.name).join(", ");
      toast.success(t("combat.enemy.impactDone", { k: results.length }));

    } else if (mode === "logOnly" && !initialResolvedTargets) {
      resolvedTargetsLabel = selectedArr
        .map(id => participants.find(p => p.id === id || p.character_id === id)?.display_name)
        .filter(Boolean)
        .join(", ");
    }

    if (damageOk) {
      await logEnemySkillUse(participant, skill, {
        visibility,
        resolvedTargets: resolvedTargetsLabel.trim() || undefined,
        rollResult: rollResult > 0 ? String(rollResult) : undefined,
        dmNote: dmNote.trim() || undefined,
      });
    }

    setBusy(false);
    if (damageOk) {
      onConfirmed?.();
      onClose();
    }
  };

  const showApplyControls = !skipDamageApplication;
  const customImg = getEnemyCustomImage(participant);
  const hasImageVisual = !!customImg || !!getEnemyAssetUrl(participant.enemy_icon);

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center p-2 sm:p-3" {...backdropProps(onClose)}>
      <div className="ornate-card max-w-md w-full max-h-[92vh] overflow-y-auto p-4 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div
            className="relative w-16 h-16 rounded-full border-2 overflow-hidden flex items-center justify-center shrink-0 bg-[var(--secondary)]"
            style={{ borderColor: color, color }}
          >
            <EnemyIcon name={participant.enemy_icon} size={36} fill={hasImageVisual} customImage={customImg} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("combat.enemy.useSkill")}</p>
            <p className="font-display text-sm truncate" style={{ color }}>{skill.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{participant.display_name}</p>
          </div>
        </div>

        <div className="text-[11px] space-y-0.5 bg-black/30 rounded p-2">
          {skill.dice && <p><span className="text-muted-foreground">{t("bestiary.dice")}: </span><span style={{ color: "var(--gold)" }}>{skill.dice}</span></p>}
          {skill.range_text && <p><span className="text-muted-foreground">{t("bestiary.range")}: </span><span style={{ color: "#60a5fa" }}>{skill.range_text}</span></p>}
          {skill.targets && <p><span className="text-muted-foreground">{t("bestiary.targets")}: </span><span style={{ color: "#34d399" }}>{skill.targets}</span></p>}
          {skill.effect && <p className="text-foreground/85"><StatText>{skill.effect}</StatText></p>}
          {skill.visual_brief && <p className="italic" style={{ color: "#c4b5fd" }}><StatText>{skill.visual_brief}</StatText></p>}
        </div>

        {showApplyControls && (
          <div className="space-y-1">
            <label className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">
              {t("combat.enemy.rollResult")}
            </label>
            <NumberInput min={0} value={rollResult} onChange={setRollResult} />
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">
              {t("combat.enemy.selectTargets")} ({selected.size}/{possibleTargets.length})
            </label>
            {possibleTargets.length > 0 && (
              <div className="flex gap-2 text-[10px]">
                <button className="underline text-muted-foreground" onClick={selectAll} type="button">{t("combat.attack.all")}</button>
                <button className="underline text-muted-foreground" onClick={clearAll} type="button">{t("combat.attack.none")}</button>
              </div>
            )}
          </div>
          {possibleTargets.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">{t("combat.enemy.noPlayersInCombat")}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {possibleTargets.map(p => {
                const id = p.character_id || p.id;
                const on = selected.has(id);
                const linked = !!p.turn_group_id;
                const sh = p.participant_type === "player" ? (shieldsByChar[p.character_id!] || 0) : 0;
                const targetChar = p.character_id ? characters.find(c => c.id === p.character_id) : null;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(id)}
                    className="px-2 py-1 rounded-full border text-[11px] font-display flex items-center gap-1.5 transition"
                    style={{
                      borderColor: on ? (p.color || p.enemy_color || "var(--gold)") : "var(--border)",
                      background: on
                        ? `color-mix(in oklab, ${p.color || p.enemy_color || "var(--gold)"} 30%, var(--card))`
                        : "var(--card)",
                      color: on ? "var(--foreground)" : "var(--muted-foreground)",
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.enemy_color || "var(--gold)" }} />
                    <span className="truncate max-w-[120px]">{p.display_name}</span>
                    {p.participant_type === "player" ? (
                      <span className="text-[9px] opacity-80">{targetChar?.current_hp}/{targetChar?.base_hp}</span>
                    ) : (
                      <span className="text-[9px] opacity-80">{p.enemy_hp}/{p.enemy_max_hp}</span>
                    )}
                    {sh > 0 && <span className="text-[9px]" style={{ color: "#60a5fa" }}>🛡{sh}</span>}
                    {linked && <span className="text-[9px] opacity-70">⛓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {showApplyControls && (
          <div className="space-y-1">
            <label className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">
              {t("combat.enemy.damageMode")}
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <ModeBtn active={mode === "individual"} onClick={() => setMode("individual")} title={t("combat.enemy.modeIndividual")} hint={t("combat.enemy.modeIndividualHint")} />
              <ModeBtn active={mode === "direct"} onClick={() => setMode("direct")} title={t("combat.enemy.modeDirect")} hint={t("combat.enemy.modeDirectHint")} />
              <ModeBtn active={mode === "split"} onClick={() => setMode("split")} title={t("combat.enemy.modeSplit")} hint={t("combat.enemy.modeSplitHint")} />
              <ModeBtn active={mode === "logOnly"} onClick={() => setMode("logOnly")} title={t("combat.enemy.logOnly")} hint={t("combat.enemy.logOnlyHint")} />
            </div>
          </div>
        )}

        {showApplyControls && anySelectedLinked && mode !== "logOnly" && (
          <label className="flex items-start gap-2 text-xs">
            <input type="checkbox" className="mt-0.5" checked={includeLink} onChange={e => setIncludeLink(e.target.checked)} />
            <span>
              <span className="font-display">{t("combat.enemy.includeLink")}</span>
              <span className="block text-[10px] text-muted-foreground">{t("combat.enemy.includeLinkHint")}</span>
            </span>
          </label>
        )}

        <label className="block space-y-1">
          <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{t("combat.enemy.dmNote")}</span>
          <textarea value={dmNote} onChange={e => setDmNote(e.target.value)} rows={2}
            className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1.5 text-sm" />
        </label>

        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("combat.enemy.visibility")}</p>
          {(["full", "nameAndEffect", "private"] as EnemySkillVisibility[]).map(v => (
            <label key={v} className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="radio" name="vis" checked={visibility === v} onChange={() => setVisibility(v)} />
              {v === "full" && t("combat.enemy.showFullDetails")}
              {v === "nameAndEffect" && t("combat.enemy.showNameEffectOnly")}
              {v === "private" && t("combat.enemy.keepPrivate")}
            </label>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button className="btn-fantasy" onClick={onClose} disabled={busy}>{t("common.cancel")}</button>
          <button className="btn-fantasy" disabled={busy}
            style={{ background: "var(--gradient-gold)", color: "oklch(0.15 0.03 25)" }}
            onClick={submit}>
            {busy ? t("combat.enemy.applying") : (showApplyControls && mode !== "logOnly" ? t("combat.enemy.confirmImpact") : t("common.confirm"))}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModeBtn({ active, onClick, title, hint }: { active: boolean; onClick: () => void; title: string; hint: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded border px-2 py-1.5 transition"
      style={{
        borderColor: active ? "var(--gold)" : "var(--border)",
        background: active ? "color-mix(in oklab, var(--gold) 18%, var(--card))" : "var(--card)",
      }}
    >
      <p className="text-[11px] font-display">{title}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{hint}</p>
    </button>
  );
}

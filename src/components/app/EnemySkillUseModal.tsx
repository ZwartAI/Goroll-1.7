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

/**
 * DM-side modal for using an enemy skill in combat.
 *
 * Replaces the previous free-text "resolved targets" input with a chip-based
 * target selector tied to live combat participants. Reuses
 * `applyEnemyAttackToPlayers` so defense, temporary shields, HP and Link
 * spreading stay consistent with the standard enemy attack flow.
 *
 * When opened from `EnemyAttackPlayersModal` (which already applied damage),
 * pass `skipDamageApplication` so this modal only records the visibility log.
 */
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

  // Players currently in this encounter.
  const playerParticipants = combat.participants.filter(p => p.participant_type === "player");
  const presentCharIds = new Set(playerParticipants.map(p => p.character_id).filter(Boolean) as string[]);
  const players = characters.filter(c => c.role === "player" && presentCharIds.has(c.id));

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set((initialSelectedCharIds || []).filter(id => presentCharIds.has(id)))
  );
  const [rollResult, setRollResult] = useState<number>(initialRollResult ?? 0);
  const [mode, setMode] = useState<DamageMode>(
    skipDamageApplication ? "logOnly" : (initialDistribution ?? "individual")
  );
  const [includeLink, setIncludeLink] = useState(false);
  const [dmNote, setDmNote] = useState("");
  const [visibility, setVisibility] = useState<EnemySkillVisibility>("full");
  const [busy, setBusy] = useState(false);


  const color = participant.enemy_color || "var(--loss)";
  const selectedArr = useMemo(() => Array.from(selected), [selected]);

  const anySelectedLinked = selectedArr.some(cid => {
    const p = playerParticipants.find(pp => pp.character_id === cid);
    return !!p?.turn_group_id;
  });

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(players.map(p => p.id)));
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
      
      for (const charId of selectedArr) {
        let amount = rollResult;
        if (distributionMode === "split") {
          amount = Math.floor(rollResult / selected.size); // simpler split for now
        }
        
        const r = await resolveDamageAgainstEntity({
          targetId: charId,
          targetType: "character",
          encounterId: encounterId!,
          campaignId: combat.encounter?.campaign_id!,
          amount,
          mode: mode === "direct" ? "directDamage" : "damageWithDefense",
          sourceName: participant.display_name,
          skillName: skill.name,
          skipLogging: true // logEnemySkillUse will handle the main log
        });
        
        if (r) results.push({ name: characters.find(c => c.id === charId)?.name || "---" });
      }

      resolvedTargetsLabel = results.map(x => x.name).join(", ");
      toast.success(t("combat.enemy.impactDone", { k: results.length }));

    } else if (mode === "logOnly" && !initialResolvedTargets) {
      // No damage requested: still surface the selected names in the log.
      resolvedTargetsLabel = selectedArr
        .map(id => characters.find(c => c.id === id)?.name)
        .filter(Boolean)
        .join(", ");
    }

    // Always emit the visibility log entry (skill card in feed).
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
        {/* Header */}
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

        {/* Skill summary */}
        <div className="text-[11px] space-y-0.5 bg-black/30 rounded p-2">
          {skill.dice && <p><span className="text-muted-foreground">{t("bestiary.dice")}: </span><span style={{ color: "var(--gold)" }}>{skill.dice}</span></p>}
          {skill.range_text && <p><span className="text-muted-foreground">{t("bestiary.range")}: </span><span style={{ color: "#60a5fa" }}>{skill.range_text}</span></p>}
          {skill.targets && <p><span className="text-muted-foreground">{t("bestiary.targets")}: </span><span style={{ color: "#34d399" }}>{skill.targets}</span></p>}
          {skill.effect && <p className="text-foreground/85"><StatText>{skill.effect}</StatText></p>}
          {skill.visual_brief && <p className="italic" style={{ color: "#c4b5fd" }}><StatText>{skill.visual_brief}</StatText></p>}
        </div>

        {/* Roll result */}
        {showApplyControls && (
          <div className="space-y-1">
            <label className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">
              {t("combat.enemy.rollResult")}
            </label>
            <NumberInput min={0} value={rollResult} onChange={setRollResult} />
          </div>
        )}

        {/* Targets — chips */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">
              {t("combat.enemy.selectTargets")} ({selected.size}/{players.length})
            </label>
            {players.length > 0 && (
              <div className="flex gap-2 text-[10px]">
                <button className="underline text-muted-foreground" onClick={selectAll} type="button">{t("combat.attack.all")}</button>
                <button className="underline text-muted-foreground" onClick={clearAll} type="button">{t("combat.attack.none")}</button>
              </div>
            )}
          </div>
          {players.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">{t("combat.enemy.noPlayersInCombat")}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {players.map(c => {
                const on = selected.has(c.id);
                const p = playerParticipants.find(pp => pp.character_id === c.id);
                const linked = !!p?.turn_group_id;
                const sh = shieldsByChar[c.id] || 0;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle(c.id)}
                    className="px-2 py-1 rounded-full border text-[11px] font-display flex items-center gap-1.5 transition"
                    style={{
                      borderColor: on ? (c.color || "var(--gold)") : "var(--border)",
                      background: on
                        ? `color-mix(in oklab, ${c.color || "var(--gold)"} 30%, var(--card))`
                        : "var(--card)",
                      color: on ? "var(--foreground)" : "var(--muted-foreground)",
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: c.color || "var(--gold)" }} />
                    <span className="truncate max-w-[120px]">{c.name}</span>
                    <span className="text-[9px] opacity-80">{c.current_hp}/{c.base_hp}</span>
                    {sh > 0 && <span className="text-[9px]" style={{ color: "#60a5fa" }}>🛡{sh}</span>}
                    {linked && <span className="text-[9px] opacity-70">⛓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Damage mode */}
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

        {/* Include link toggle */}
        {showApplyControls && anySelectedLinked && mode !== "logOnly" && (
          <label className="flex items-start gap-2 text-xs">
            <input type="checkbox" className="mt-0.5" checked={includeLink} onChange={e => setIncludeLink(e.target.checked)} />
            <span>
              <span className="font-display">{t("combat.enemy.includeLink")}</span>
              <span className="block text-[10px] text-muted-foreground">{t("combat.enemy.includeLinkHint")}</span>
            </span>
          </label>
        )}

        {/* DM note */}
        <label className="block space-y-1">
          <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{t("combat.enemy.dmNote")}</span>
          <textarea value={dmNote} onChange={e => setDmNote(e.target.value)} rows={2}
            className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1.5 text-sm" />
        </label>

        {/* Visibility */}
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

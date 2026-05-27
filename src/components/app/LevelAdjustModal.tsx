import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { pushLog } from "@/lib/log";
import { useT } from "@/lib/i18n";
import { backdropProps } from "@/lib/modalBackdrop";
import { Minus, Plus } from "lucide-react";
import type { Character } from "@/lib/game";

type Props = {
  character: Character;
  campaignId: string;
  editor: { id: string; name: string; color: string };
  onClose: () => void;
};

/**
 * Small DM-only modal to bump a character's level by ±1.
 * Each "+" grants +1 Skill Point; each "−" subtracts 1 SP (SP can go negative
 * on purpose, to represent SPs the player already spent by mistake).
 * Level cannot go below 1. Both player profile and DM panel update in
 * realtime via the existing characters-table subscriptions.
 */
export function LevelAdjustModal({ character, campaignId, editor, onClose }: Props) {
  const { t } = useT();
  const [level, setLevel] = useState<number>((character as any).level ?? 1);
  const [sp, setSp] = useState<number>((character as any).skill_points ?? 0);
  const [busy, setBusy] = useState(false);

  // Keep local state in sync if the character row updates while modal is open.
  useEffect(() => {
    setLevel((character as any).level ?? 1);
    setSp((character as any).skill_points ?? 0);
  }, [(character as any).level, (character as any).skill_points]);

  async function bump(delta: 1 | -1) {
    if (busy) return;
    const nextLevel = Math.max(1, level + delta);
    if (nextLevel === level) return;
    const nextSp = sp + delta; // SP may go negative on intent
    setBusy(true);
    const prev = { level, skill_points: sp };
    setLevel(nextLevel);
    setSp(nextSp);
    const { error } = await supabase
      .from("characters")
      .update({ level: nextLevel, skill_points: nextSp } as any)
      .eq("id", character.id);
    if (error) {
      // rollback UI
      setLevel(level);
      setSp(sp);
      setBusy(false);
      return;
    }
    await pushLog(
      campaignId,
      [
        { t: "char", v: editor.name, color: editor.color, id: editor.id },
        { t: "text", v: delta > 0 ? t("levelAdjust.logUp") : t("levelAdjust.logDown") },
        { t: "char", v: character.name, color: character.color, id: character.id },
        { t: "text", v: t("levelAdjust.logLevelTo", { level: nextLevel }) },
        delta > 0
          ? { t: "gain", v: t("levelAdjust.logSpAdd") }
          : { t: "loss", v: t("levelAdjust.logSpSub") },
      ],
      { kind: "character.update", id: character.id, prev },
    );
    setBusy(false);
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
      {...backdropProps(onClose)}
    >
      <div
        className="ornate-card w-full max-w-xs p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-center text-lg text-[var(--gold)] uppercase tracking-widest">
          {t("levelAdjust.title")}
        </h3>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => bump(-1)}
            disabled={busy || level <= 1}
            aria-label={t("levelAdjust.decrease")}
            className="w-12 h-12 rounded-md border border-border bg-card hover:border-[var(--gold)]/60 disabled:opacity-40 flex items-center justify-center transition"
          >
            <Minus size={22} />
          </button>

          <div className="min-w-[88px] text-center select-none">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {t("level.short")}
            </p>
            <p
              className="font-display font-bold text-5xl leading-none tabular-nums text-[var(--gold)]"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}
            >
              {level}
            </p>
            <p className="text-[10px] mt-1 text-muted-foreground">
              SP: <span className={sp < 0 ? "text-[var(--loss)]" : "text-[var(--gold)]"}>{sp}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => bump(1)}
            disabled={busy}
            aria-label={t("levelAdjust.increase")}
            className="w-12 h-12 rounded-md border border-border bg-card hover:border-[var(--gold)]/60 disabled:opacity-40 flex items-center justify-center transition"
          >
            <Plus size={22} />
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="btn-fantasy w-full"
          style={{ background: "var(--gradient-gold)", color: "oklch(0.15 0.03 25)" }}
        >
          {t("common.accept")}
        </button>
      </div>
    </div>
  );
}

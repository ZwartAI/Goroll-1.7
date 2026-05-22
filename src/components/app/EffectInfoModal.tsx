import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type TempEffect = Tables<"combat_temporary_effects">;
type CharCondition = Tables<"character_conditions">;

export type EffectInfoInput =
  | { kind: "temporary"; row: TempEffect }
  | { kind: "condition"; row: CharCondition };

type Props = {
  effect: EffectInfoInput;
  onClose: () => void;
};

/** Strip leading emoji from a "🔥 Quemadura" style label, returning just text. */
function splitEmojiLabel(raw: string | null | undefined): { emoji: string | null; text: string } {
  const v = (raw || "").trim();
  if (!v) return { emoji: null, text: "" };
  const parts = v.split(/\s+/);
  if (parts.length > 1 && !/[a-z0-9]/i.test(parts[0])) {
    return { emoji: parts[0], text: parts.slice(1).join(" ") };
  }
  return { emoji: null, text: v };
}

export function EffectInfoModal({ effect, onClose }: Props) {
  const { t } = useT();
  const [sourceName, setSourceName] = useState<string | null>(null);

  // Normalize fields across the two row types.
  const normalized = (() => {
    if (effect.kind === "temporary") {
      const r = effect.row;
      const { emoji, text } = splitEmojiLabel(r.label);
      const typeKey =
        r.effect_type === "shield" ? "shield" :
        r.effect_type === "buff" ? "buff" :
        r.effect_type === "debuff" ? "debuff" :
        r.effect_type === "control" ? "control" :
        r.effect_type === "note" ? "note" :
        "condition";
      const dmg = Math.max(0, Math.floor(r.value || 0));
      const isDamage = typeKey !== "shield" && typeKey !== "note" && dmg > 0;
      const isShield = typeKey === "shield";
      return {
        emoji: emoji || (typeKey === "shield" ? "🛡️" : typeKey === "buff" ? "✨" : typeKey === "control" ? "💫" : typeKey === "note" ? "📜" : "☠️"),
        name: text || (r.effect_type || ""),
        typeLabel: t(`combat.effects.types.${isDamage ? "dot" : typeKey}`),
        remainingTurns: typeof r.duration_rounds === "number" ? r.duration_rounds : null,
        damagePerTurn: isDamage ? dmg : 0,
        value: isShield ? dmg : null,
        description: null as string | null,
        sourceCharacterId: r.source_character_id || null,
      };
    } else {
      const r = effect.row;
      return {
        emoji: r.icon || "✨",
        name: r.label || "",
        typeLabel: t(`combat.effects.types.${(r.damage_per_turn || 0) > 0 ? "dot" : "condition"}`),
        remainingTurns: typeof r.turns_left === "number" ? r.turns_left : null,
        damagePerTurn: Math.max(0, Math.floor(r.damage_per_turn || 0)),
        value: null,
        description: null,
        sourceCharacterId: null,
      };
    }
  })();

  useEffect(() => {
    let alive = true;
    const sid = normalized.sourceCharacterId;
    if (!sid) { setSourceName(null); return; }
    (async () => {
      const { data } = await supabase
        .from("characters")
        .select("name")
        .eq("id", sid)
        .maybeSingle();
      if (alive) setSourceName((data as any)?.name || null);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalized.sourceCharacterId]);

  return (
    <div className="fixed inset-0 bg-black/85 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="ornate-card p-4 max-w-xs w-full space-y-3"
        onClick={e => e.stopPropagation()}
        style={{ borderColor: "var(--gold)" }}
      >
        <div className="flex items-center gap-3">
          <div className="text-3xl leading-none w-10 h-10 flex items-center justify-center rounded-md border border-border bg-card">
            {normalized.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {normalized.typeLabel}
            </p>
            <h3 className="font-display text-base text-[var(--gold)] truncate">
              {normalized.name || t("combat.effects.types.condition")}
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-xs">
          {normalized.remainingTurns !== null && (
            <Field label={t("combat.effects.info.remainingTurns")} value={`${normalized.remainingTurns}t`} />
          )}
          {normalized.damagePerTurn > 0 && (
            <Field
              label={t("combat.effects.info.damagePerTurn")}
              value={`-${normalized.damagePerTurn}`}
              tone="loss"
            />
          )}
          {normalized.value !== null && (
            <Field label={t("combat.effects.info.value")} value={String(normalized.value)} tone="gain" />
          )}
          {sourceName && (
            <Field label={t("combat.effects.info.source")} value={sourceName} />
          )}
        </div>

        {normalized.description && (
          <div className="ornate-card p-2 text-[11px] text-muted-foreground italic">
            {normalized.description}
          </div>
        )}

        <button
          type="button"
          className="btn-fantasy w-full text-xs py-1.5"
          onClick={onClose}
        >
          {t("combat.effects.info.close")}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, tone }: { label: string; value: string; tone?: "loss" | "gain" }) {
  const color = tone === "loss" ? "var(--loss)" : tone === "gain" ? "var(--gain)" : undefined;
  return (
    <div className="ornate-card !p-1.5 flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="font-display text-xs" style={{ color }}>{value}</span>
    </div>
  );
}

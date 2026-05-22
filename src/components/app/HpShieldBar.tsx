import { useT } from "@/lib/i18n";

type Props = {
  current: number;
  max: number;
  shield?: number;
  /** Optional override for the HP fill color. */
  hpColor?: string;
  /** Bar height in px. Default 6. */
  height?: number;
  /** Hide the small label row below the bar. */
  hideLabel?: boolean;
  /** Compact label alignment: "center" (default) or "left". */
  align?: "center" | "left";
};

/**
 * HP bar with a dedicated shield bar rendered above it. The shield bar shows
 * the remaining absorbed value as a separate cyan layer so it never visually
 * eats the HP fill. Updates instantly when the parent passes new values.
 */
export function HpShieldBar({
  current,
  max,
  shield = 0,
  hpColor,
  height = 6,
  hideLabel,
  align = "center",
}: Props) {
  const { t } = useT();
  const safeMax = Math.max(1, max);
  const safeHp = Math.max(0, Math.min(safeMax, current));
  const hpPct = (safeHp / safeMax) * 100;
  const sh = Math.max(0, Math.floor(shield));
  // Shield bar width is relative to max HP, capped at 100%.
  const shPct = Math.min(100, (sh / safeMax) * 100);
  const autoColor = hpPct > 60 ? "var(--gain)" : hpPct > 30 ? "#eab308" : "var(--loss)";
  const fill = hpColor || autoColor;

  return (
    <div className="space-y-0.5">
      {sh > 0 && (
        <div
          className="rounded-full bg-card/60 border border-cyan-400/40 overflow-hidden"
          style={{ height: Math.max(3, Math.floor(height * 0.55)) }}
          title={t("combat.dmEffects.valueShield")}
          aria-label={`shield ${sh}`}
        >
          <div
            className="h-full transition-all"
            style={{
              width: `${shPct}%`,
              background: "linear-gradient(90deg, #67e8f9, #06b6d4)",
              boxShadow: "0 0 6px rgba(6,182,212,0.55)",
            }}
          />
        </div>
      )}
      <div
        className="rounded-full bg-secondary overflow-hidden"
        style={{ height }}
      >
        <div className="h-full transition-all" style={{ width: `${hpPct}%`, background: fill }} />
      </div>
      {!hideLabel && (
        <p
          className={`text-[10px] ${align === "left" ? "text-left" : "text-center"} text-muted-foreground font-display leading-tight`}
        >
          ❤️ {safeHp}/{safeMax}
          {sh > 0 && (
            <span className="ml-1.5 text-cyan-300">🛡️ +{sh}</span>
          )}
        </p>
      )}
    </div>
  );
}

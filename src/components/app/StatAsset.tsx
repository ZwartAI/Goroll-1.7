import type { ReactNode } from "react";

type Props = {
  src: string;
  value: ReactNode;
  ariaLabel: string;
  /** Vertical position (in %) of the value inside the card. Default 74%. */
  valueTopPct?: number;
};

/**
 * Vertical stat asset (Damage / Defense / Speed). The asset already includes
 * the icon and a divider; we only overlay the numeric value in the lower half.
 */
export function StatAsset({ src, value, ariaLabel, valueTopPct = 74 }: Props) {
  return (
    <div
      className="relative w-full select-none"
      style={{ aspectRatio: "95 / 140" }}
      aria-label={ariaLabel}
    >
      <img
        src={src}
        alt=""
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        draggable={false}
      />
      <div
        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none"
        style={{ top: `${valueTopPct}%`, transform: "translateY(-50%)" }}
      >
        <span
          className="font-display font-bold leading-none text-[var(--gold)]"
          style={{
            fontSize: "clamp(16px, 6cqw, 28px)",
            textShadow: "0 1px 2px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7)",
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

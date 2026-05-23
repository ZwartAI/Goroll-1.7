import type { Character } from "@/lib/game";
import portraitFrameDefault from "@/assets/character-sheet/portrait-frame-default.png";

type Props = {
  character: Pick<Character, "name" | "color" | "image_url" | "image_offset_x" | "image_offset_y" | "image_scale"> & {
    level?: number | null;
    portrait_frame_url?: string | null;
  };
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
  level?: number;
};

/**
 * Reusable framed portrait. Renders:
 *  1. Character face image (zoom/offset respected) as the background layer.
 *  2. A decorative frame asset on top (intercambiable via character.portrait_frame_url).
 *  3. The character level number centered inside the frame's top-left circle.
 *
 * The frame asset's circle sits roughly at top:6.5% / left:6.5% with diameter ~22%
 * of the total frame size. The inner artwork area covers ~10% inset all around.
 */
export function FramedCharacterPortrait({ character, onClick, ariaLabel, className = "", level }: Props) {
  const frameUrl = (character as any).portrait_frame_url || portraitFrameDefault;
  const ox = character.image_offset_x ?? 50;
  const oy = character.image_offset_y ?? 50;
  const scale = character.image_scale || 1;
  const lvl = level ?? (character as any).level ?? 1;

  const Inner = (
    <div className={`relative aspect-square w-full select-none ${className}`}>
      {/* Inner portrait area, inset to match the frame's inner opening */}
      <div
        className="absolute overflow-hidden bg-[var(--secondary)]"
        style={{ inset: "9%", borderRadius: "6%" }}
      >
        {character.image_url ? (
          <img
            src={character.image_url}
            alt={character.name}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            draggable={false}
            style={{
              transform: `translate(${ox - 50}%, ${oy - 50}%) scale(${scale})`,
              transformOrigin: "center center",
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <span className="font-display text-3xl" style={{ color: character.color }}>
              {character.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Frame overlay */}
      <img
        src={frameUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        draggable={false}
      />

      {/* Level number centered in frame's top-left circle */}
      <div
        className="absolute pointer-events-none flex items-center justify-center"
        style={{
          top: "2.5%",
          left: "2.5%",
          width: "20%",
          height: "20%",
        }}
        aria-label={`Level ${lvl}`}
      >
        <span
          className="font-display font-bold leading-none text-[var(--gold)]"
          style={{
            fontSize: "clamp(14px, 4.2cqw, 28px)",
            textShadow: "0 1px 2px rgba(0,0,0,0.85), 0 0 6px rgba(0,0,0,0.6)",
          }}
        >
          {lvl}
        </span>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className="block w-full p-0 bg-transparent border-0 transition-transform active:scale-[0.98]"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        {Inner}
      </button>
    );
  }
  return Inner;
}

import type { Character } from "@/lib/game";

/**
 * Reusable character portrait. Respects the player's image zoom/offset so
 * the framing matches what they configured on their own Character Sheet.
 */
export function CharacterPortrait({
  character,
  className = "",
  rounded = "rounded-full",
  showBorder = true,
}: {
  character: Pick<Character, "name" | "color"> & {
    image_url?: string | null;
    image_offset_x?: number | null;
    image_offset_y?: number | null;
    image_scale?: number | null;
  };
  className?: string;
  rounded?: string;
  showBorder?: boolean;
}) {
  const url = (character as any).image_url as string | null | undefined;
  const ox = (character as any).image_offset_x ?? 50;
  const oy = (character as any).image_offset_y ?? 50;
  const scale = (character as any).image_scale || 1;
  const borderCls = showBorder ? "" : "";
  return (
    <div
      className={`${rounded} overflow-hidden flex items-center justify-center bg-[var(--secondary)] relative ${borderCls} ${className}`}
    >
      {url ? (
        <img
          src={url}
          alt={character.name}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            transform: `translate(${ox - 50}%, ${oy - 50}%) scale(${scale})`,
            transformOrigin: "center center",
          }}
        />
      ) : (
        <span className="font-display" style={{ color: character.color }}>
          {character.name.charAt(0)}
        </span>
      )}
    </div>
  );
}

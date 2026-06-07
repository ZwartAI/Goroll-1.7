import spIconAsset from "@/assets/sp-icon.png.asset.json";

type Props = {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
};

/**
 * Shared visual for Skill Points (SP). Replaces the previous Gem icon
 * everywhere SP is shown (badges, balances, popups).
 */
export function SpIcon({ size = 16, className, style, alt = "SP" }: Props) {
  return (
    <img
      src={spIconAsset.url}
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        display: "inline-block",
        ...style,
      }}
      draggable={false}
    />
  );
}

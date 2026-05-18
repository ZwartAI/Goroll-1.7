import { Mic, MicOff } from "lucide-react";

type Props = {
  enabled: boolean;
  onToggle: () => void;
  className?: string;
};

/** Compact mic toggle for the page header. Green when live, muted when off. */
export function MicToggle({ enabled, onToggle, className }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={enabled ? "Silenciar micrófono" : "Activar micrófono"}
      title={enabled ? "Silenciar micrófono" : "Activar micrófono"}
      className={`inline-flex items-center justify-center rounded-md p-1 transition ${
        enabled
          ? "text-[var(--gain)] hover:opacity-80"
          : "text-muted-foreground hover:text-foreground"
      } ${className || ""}`}
      style={enabled ? { filter: "drop-shadow(0 0 6px var(--gain))" } : undefined}
    >
      {enabled ? <Mic size={20} /> : <MicOff size={20} />}
    </button>
  );
}

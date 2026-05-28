import { useT } from "@/lib/i18n";
import { backdropProps } from "@/lib/modalBackdrop";
import { Swords, Heart, HeartOff, X } from "lucide-react";

type Props = {
  characterName: string;
  isSurvivor: boolean;
  onClose: () => void;
};

export function CombatEndModal({ characterName, isSurvivor, onClose }: Props) {
  const { t } = useT();

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" {...backdropProps(onClose)}>
      <div 
        className="ornate-card max-w-sm w-full p-6 space-y-4 text-center animate-in fade-in zoom-in duration-300"
        onClick={e => e.stopPropagation()}
        style={{ 
          borderColor: isSurvivor ? "var(--gain)" : "var(--loss)",
          boxShadow: isSurvivor ? "0 0 20px -5px var(--gain)" : "0 0 20px -5px var(--loss)"
        }}
      >
        <div className="flex justify-center">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center border-2 mb-2"
            style={{ 
              borderColor: isSurvivor ? "var(--gain)" : "var(--loss)",
              background: `color-mix(in oklab, ${isSurvivor ? "var(--gain)" : "var(--loss)"} 15%, var(--card))`
            }}
          >
            {isSurvivor ? (
              <Heart className="text-[var(--gain)]" size={32} />
            ) : (
              <HeartOff className="text-[var(--loss)]" size={32} />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="font-display text-xl uppercase tracking-widest text-foreground">
            {t("combat.ended.title")}
          </h2>
          <p className="text-sm font-medium" style={{ color: isSurvivor ? "var(--gain)" : "var(--loss)" }}>
            {isSurvivor ? t("combat.ended.survivor") : t("combat.ended.defeated")}
          </p>
        </div>

        <div className="py-2">
          <p className="text-lg font-display text-[var(--gold)]">{characterName}</p>
          <p className="text-sm text-muted-foreground mt-2">
            {isSurvivor ? t("combat.ended.survivedMsg") : t("combat.ended.defeatedMsg")}
          </p>
        </div>

        <button 
          className="btn-fantasy w-full py-2.5 mt-2"
          onClick={onClose}
        >
          {t("common.accept")}
        </button>
      </div>
    </div>
  );
}

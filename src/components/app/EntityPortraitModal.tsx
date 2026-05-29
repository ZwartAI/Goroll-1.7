import { X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { backdropProps } from "@/lib/modalBackdrop";
import { EnemyIcon, getEnemyAssetUrl, getEnemyCustomImage } from "./EnemyIconPicker";
import type { CombatParticipant } from "@/lib/combat";

type Props = {
  participant: CombatParticipant;
  onClose: () => void;
};

export function EntityPortraitModal({ participant, onClose }: Props) {
  const { t } = useT();
  const color = participant.enemy_color || participant.color || "var(--gold)";
  const customImg = getEnemyCustomImage(participant);
  const assetUrl = getEnemyAssetUrl(participant.enemy_icon);
  const isTierAsset = !!customImg || !!assetUrl;

  return (
    <div className="fixed inset-0 z-[400] bg-black/90 flex items-center justify-center p-4" {...backdropProps(onClose)}>
      <div className="ornate-card w-full max-w-lg flex flex-col items-center p-6 space-y-4 relative" onClick={e => e.stopPropagation()}>
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1"
          aria-label={t("common.close")}
        >
          <X size={24} />
        </button>

        <h2 className="font-display text-2xl text-center uppercase tracking-widest px-4" style={{ color }}>
          {participant.display_name}
        </h2>

        <div className="gem-divider w-full opacity-50" />

        <div 
          className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full border-4 overflow-hidden bg-card flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)]"
          style={{ borderColor: color }}
        >
          {participant.image_url || isTierAsset ? (
            <div className="w-full h-full relative">
              <EnemyIcon 
                name={participant.enemy_icon} 
                size={160} 
                fill={isTierAsset} 
                customImage={customImg} 
                className="w-full h-full object-cover"
                style={{
                  objectPosition: `${participant.enemy_image_offset_x ?? 50}% ${participant.enemy_image_offset_y ?? 50}%`,
                  transform: `scale(${participant.enemy_image_scale ?? 1})`,
                }}
              />
            </div>
          ) : (
            <div className="text-6xl" style={{ color }}>🧙</div>
          )}
        </div>

        <div className="gem-divider w-full opacity-50" />

        <button 
          className="btn-fantasy w-full sm:w-48 py-2.5 mt-2" 
          onClick={onClose}
        >
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}

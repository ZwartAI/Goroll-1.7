import { X } from "lucide-react";
import { EnemyIcon, getEnemyCustomImage, getEnemyAssetUrl } from "./EnemyIconPicker";
import { backdropProps } from "@/lib/modalBackdrop";
import { useT } from "@/lib/i18n";

type Props = {
  name: string;
  icon: string | null;
  customImage?: any;
  onClose: () => void;
};

export function EntityPortraitModal({ name, icon, customImage, onClose }: Props) {
  const { t } = useT();
  const customImg = customImage ? customImage : null;
  const isTierAsset = !!customImg || !!getEnemyAssetUrl(icon);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" {...backdropProps(onClose)}>
      <div className="ornate-card max-w-sm w-full p-4 flex flex-col items-center gap-6 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-2 right-2 p-1 rounded hover:bg-white/10 text-muted-foreground transition-colors" aria-label={t("common.close")}>
          <X size={20} />
        </button>
        
        <h2 className="font-display text-xl uppercase tracking-widest text-[var(--gold)] text-center px-6">
          {name}
        </h2>
        
        <div className="w-64 h-64 rounded-full border-4 border-[var(--gold)]/40 flex-shrink-0 flex items-center justify-center bg-card overflow-hidden relative shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          <EnemyIcon name={icon} size={180} fill={isTierAsset} customImage={customImg} />
        </div>
        
        <button 
          onClick={onClose}
          className="btn-fantasy px-8 py-2 text-sm uppercase tracking-widest"
        >
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}

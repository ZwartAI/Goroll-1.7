import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n";
import { type RewardSack, SACK_TYPE_COLORS } from "@/lib/rewards";
import { X, Gift, Coins, Sword, Sparkles, Wand2, RefreshCw } from "lucide-react";
import { backdropProps } from "@/lib/modalBackdrop";

interface Props {
  sack: RewardSack;
  onClose: () => void;
}

export function RewardSackSimulator({ sack, onClose }: Props) {
  const { t } = useT();
  const [result, setResult] = useState<{
    coins: number;
    items: string[];
    boosters: string[];
    skills: string[];
  } | null>(null);

  const simulate = () => {
    // Basic simulation logic for Phase 1
    const coins = sack.has_coins 
      ? Math.floor(Math.random() * (sack.coins_max - sack.coins_min + 1)) + sack.coins_min 
      : 0;
    
    // In phase 1 we just list the counts or manual IDs for simplicity
    setResult({
      coins,
      items: sack.manual_item_ids,
      boosters: sack.manual_booster_ids,
      skills: sack.manual_skill_ids,
    });
  };

  useEffect(() => {
    simulate();
  }, [sack]);

  return (
    <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-4 backdrop-blur-md" {...backdropProps(onClose)}>
      <div className="ornate-card w-full max-w-sm bg-[#0d0d0d] p-6 text-center space-y-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center">
          <div 
            className="w-24 h-24 rounded-full bg-black/60 flex items-center justify-center border-2 shadow-2xl relative"
            style={{ borderColor: SACK_TYPE_COLORS[sack.type], boxShadow: `0 0 40px ${SACK_TYPE_COLORS[sack.type]}44` }}
          >
            <Gift size={48} style={{ color: SACK_TYPE_COLORS[sack.type] }} className="animate-bounce" />
            <div className="absolute -top-2 -right-2 bg-[var(--gold)] text-black text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">SIM</div>
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="font-display text-lg uppercase tracking-widest text-white">{sack.name}</h3>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{t("rewards.simTitle")}</p>
        </div>

        {result && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 gap-2">
              {result.coins > 0 && (
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                  <div className="flex items-center gap-3">
                    <Coins className="text-[var(--gold)] w-4 h-4" />
                    <span className="text-xs uppercase font-bold text-muted-foreground">{t("rewards.coins")}</span>
                  </div>
                  <span className="font-display text-[var(--gold)]">💰 {result.coins}</span>
                </div>
              )}

              {(result.items.length > 0 || sack.has_items) && (
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                  <div className="flex items-center gap-3">
                    <Sword className="text-blue-400 w-4 h-4" />
                    <span className="text-xs uppercase font-bold text-muted-foreground">{t("rewards.equipment")}</span>
                  </div>
                  <span className="text-xs text-white">{result.items.length} {sack.random_balanced ? `+ ${t("common.random") || "Aleatorios"}` : ""}</span>
                </div>
              )}

              {(result.boosters.length > 0 || sack.has_boosters) && (
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                  <div className="flex items-center gap-3">
                    <Sparkles className="text-purple-400 w-4 h-4" />
                    <span className="text-xs uppercase font-bold text-muted-foreground">{t("rewards.boosters")}</span>
                  </div>
                  <span className="text-xs text-white">{result.boosters.length} {sack.random_balanced ? `+ ${t("common.random") || "Aleatorios"}` : ""}</span>
                </div>
              )}

              {(result.skills.length > 0 || sack.has_special_items) && (
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                  <div className="flex items-center gap-3">
                    <Wand2 className="text-[var(--rarity-gold)] w-4 h-4" />
                    <span className="text-xs uppercase font-bold text-muted-foreground">{t("rewards.specialItems")}</span>
                  </div>
                  <span className="text-xs text-white">{result.skills.length}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button 
            onClick={simulate}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded bg-white/5 hover:bg-white/10 text-[10px] uppercase font-bold tracking-widest transition-colors border border-white/5"
          >
            <RefreshCw size={14} /> {t("rewards.reSimulate")}
          </button>
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded bg-[var(--gold)] text-black text-[10px] uppercase font-bold tracking-widest transition-opacity hover:opacity-90"
            style={{ background: "var(--gradient-gold)" }}
          >
            {t("common.close")}
          </button>
        </div>

      </div>
    </div>
  );
}

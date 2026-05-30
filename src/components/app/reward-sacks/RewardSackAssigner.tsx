import { useState, useMemo, useEffect } from "react";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { type RewardSack, SACK_TYPE_COLORS } from "@/lib/rewards";
import { X, Gift, Users, Send } from "lucide-react";
import { CharacterPortrait } from "@/components/app/CharacterPortrait";
import { useGameData } from "@/lib/useGame";
import { backdropProps } from "@/lib/modalBackdrop";

interface Props {
  sack: RewardSack;
  onClose: () => void;
}

export function RewardSackAssigner({ sack, onClose }: Props) {
  const { characters, campaign } = useGameData();
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const { t } = useT();

  const players = useMemo(() => 
    characters.filter(c => c.role === 'player'), 
    [characters]
  );

  const toggleSelect = (id: string) => {
    setSelectedCharIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (selectedCharIds.length === 0) return toast.error("Selecciona al menos un aventurero");
    if (!campaign?.id) return;

    setIsAssigning(true);
    try {
      // 1. Calculate loot once if sack is constant (or per player if random)
      const assignments = selectedCharIds.map(charId => {
        const coins = sack.has_coins 
          ? Math.floor(Math.random() * (sack.coins_max - sack.coins_min + 1)) + sack.coins_min 
          : 0;
        
        // This is a simplified delivery for Phase 2.
        // In Phase 3 we will handle random item generation.
        return {
          campaign_id: campaign.id,
          character_id: charId,
          sack_id: sack.id,
          coins,
          item_ids: sack.manual_item_ids,
          skill_ids: sack.manual_skill_ids,
          booster_ids: sack.manual_booster_ids,
          status: 'pending'
        };
      });

      const { error } = await supabase
        .from("reward_assignments")
        .insert(assignments);

      if (error) throw error;

      toast.success(`Recompensas entregadas a ${selectedCharIds.length} aventurero(s)`);
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-4 backdrop-blur-md" {...backdropProps(onClose)}>
      <div className="ornate-card w-full max-w-md bg-[#0d0d0d] flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        
        <header className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift size={20} style={{ color: SACK_TYPE_COLORS[sack.type] }} />
            <h3 className="font-display text-sm uppercase tracking-widest text-white">Entregar: {sack.name}</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white"><X size={20} /></button>
        </header>

        <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Seleccionar Aventureros</span>
          <button 
            onClick={() => setSelectedCharIds(selectedCharIds.length === players.length ? [] : players.map(p => p.id))}
            className="text-[10px] uppercase tracking-widest text-[var(--gold)] hover:underline"
          >
            {selectedCharIds.length === players.length ? "Ninguno" : "Todos"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 gap-2">
          {players.map(p => {
            const isSelected = selectedCharIds.includes(p.id);
            return (
              <button 
                key={p.id}
                onClick={() => toggleSelect(p.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  isSelected 
                    ? 'bg-[var(--gold)]/10 border-[var(--gold)]/40' 
                    : 'bg-white/5 border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <div className={`w-14 h-14 rounded-full border-2 overflow-hidden transition-all ${isSelected ? 'border-[var(--gold)] scale-110 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-white/10'}`}>
                  <CharacterPortrait character={p as any} className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] font-display uppercase tracking-wider truncate w-full text-center" style={{ color: isSelected ? 'var(--gold)' : p.color || 'white' }}>
                  {p.name}
                </span>
              </button>
            );
          })}
        </div>

        <footer className="p-4 border-t border-white/10 bg-black/40">
           <button 
            onClick={handleAssign}
            disabled={isAssigning || selectedCharIds.length === 0}
            className={`btn-fantasy w-full py-3 flex items-center justify-center gap-3 font-bold uppercase tracking-widest transition-all ${
              isAssigning || selectedCharIds.length === 0 
                ? 'opacity-30 grayscale pointer-events-none' 
                : 'bg-[var(--gold)] text-black shadow-[0_0_20px_rgba(234,179,8,0.2)]'
            }`}
            style={{ background: selectedCharIds.length > 0 ? "var(--gradient-gold)" : "" }}
           >
             {isAssigning ? (
               <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black" />
             ) : (
               <>
                 <Send size={18} />
                 Entregar a {selectedCharIds.length} Jugador(es)
               </>
             )}
           </button>
        </footer>
      </div>
    </div>
  );
}

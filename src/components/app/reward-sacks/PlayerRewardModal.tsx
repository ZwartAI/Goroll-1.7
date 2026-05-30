import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useT } from "@/lib/i18n";
import { useGameData } from "@/lib/useGame";
import { supabase } from "@/integrations/supabase/client";
import { type RewardAssignment, acceptRewardAssignment } from "@/lib/rewards";
import { CharacterPortrait } from "@/components/app/CharacterPortrait";
import { Coins, Sparkles, Sword, Wand2, Check } from "lucide-react";
import { type Rarity, RARITY_COLOR, type Item, type ItemCategory } from "@/lib/game";
import type { Booster } from "@/components/app/BoosterCard";

export function PlayerRewardModal() {
  const { character, campaign, items: allItems } = useGameData();
  const [pendingReward, setPendingReward] = useState<RewardAssignment | null>(null);
  const [showContent, setShowContent] = useState(false);
  const [countingCoins, setCoins] = useState(0);
  const [revealedItems, setRevealedItems] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const { t } = useT();

  // Listen for new rewards
  useEffect(() => {
    if (!character?.id || !campaign?.id) return;

    const fetchPending = async () => {
      const { data } = await supabase
        .from("reward_assignments")
        .select("*")
        .eq("character_id", character.id)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();
      
      if (data) setPendingReward(data as RewardAssignment);
    };

    fetchPending();

    const channel = supabase.channel(`rewards:${character.id}`)
      .on("postgres_changes", { 
        event: "INSERT", 
        schema: "public", 
        table: "reward_assignments", 
        filter: `character_id=eq.${character.id}` 
      }, (payload) => {
        if (payload.new.status === 'pending') {
          setPendingReward(payload.new as RewardAssignment);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [character?.id, campaign?.id]);

  // Start animation sequence
  useEffect(() => {
    if (pendingReward && !isAnimating) {
      startSequence();
    }
  }, [pendingReward]);

  const startSequence = async () => {
    setIsAnimating(true);
    setShowContent(true);
    setRevealedItems([]);
    
    // 1. Coins animation
    if (pendingReward && pendingReward.coins > 0) {
      let current = 0;
      const step = Math.ceil(pendingReward.coins / 30);
      const interval = setInterval(() => {
        current += step;
        if (current >= pendingReward.coins) {
          setCoins(pendingReward.coins);
          clearInterval(interval);
        } else {
          setCoins(current);
        }
      }, 50);
      await new Promise(r => setTimeout(r, 1500));
    }

    // 2. Items/Boosters revelation one by one
    const allIds = [
      ...(pendingReward?.item_ids || []),
      ...(pendingReward?.booster_ids || []),
      ...(pendingReward?.skill_ids || [])
    ];

    for (const id of allIds) {
      await new Promise(r => setTimeout(r, 600));
      setRevealedItems(prev => [...prev, id]);
    }

    setIsAnimating(false);
  };

  const handleAccept = async () => {
    if (!pendingReward) return;
    try {
      await acceptRewardAssignment(pendingReward.id);
      setPendingReward(null);
      setCoins(0);
      setRevealedItems([]);
    } catch (e) {
      console.error(e);
    }
  };

  const rewardDetails = useMemo(() => {
    if (!pendingReward) return [];
    
    const details: any[] = [];
    
    // We'll need to fetch these or find them in cache
    // For now, let's look in allItems if it's an item
    pendingReward.item_ids.forEach(id => {
      const it = allItems.find(i => i.id === id);
      if (it) details.push({ id, name: it.name, rarity: it.rarity, type: 'item' });
      else details.push({ id, name: "Objeto Desconocido", rarity: 'white', type: 'item' });
    });

    pendingReward.booster_ids.forEach(id => {
      details.push({ id, name: "Potenciador", rarity: 'purple', type: 'booster' });
    });

    pendingReward.skill_ids.forEach(id => {
      details.push({ id, name: "Habilidad", rarity: 'gold', type: 'skill' });
    });

    return details;
  }, [pendingReward, allItems]);

  if (!pendingReward) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="ornate-card w-full max-w-md bg-[#0a0a0c] p-6 relative overflow-hidden flex flex-col items-center text-center shadow-[0_0_50px_rgba(0,0,0,1)]"
        style={{ borderColor: "var(--gold)" }}
      >
        {/* Fantasy Glow Effect */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[var(--gold)] rounded-full blur-[100px]" />
        </div>

        {/* Character Avatar */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="relative w-28 h-28 rounded-full border-4 border-[var(--gold)] shadow-[0_0_30px_rgba(234,179,8,0.3)] mb-4 overflow-hidden"
        >
          <CharacterPortrait character={character as any} className="w-full h-full object-cover" />
        </motion.div>

        <motion.h2 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="font-display text-2xl uppercase tracking-[0.2em] text-[var(--gold)] drop-shadow-[0_0_10px_rgba(234,179,8,0.5)] mb-6"
        >
          ¡Recompensas Obtenidas!
        </motion.h2>

        {/* Rewards Section */}
        <div className="w-full bg-black/60 border border-white/5 rounded-2xl p-4 mb-8 space-y-4 min-h-[12rem] flex flex-col justify-center">
          <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground opacity-50">Botín del Aventurero</h3>
          
          <div className="space-y-3">
            {/* Coins */}
            {pendingReward.coins > 0 && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center justify-center gap-3 py-2 px-4 bg-white/5 rounded-full border border-[var(--gold)]/20"
              >
                <div className="relative">
                  <Coins className="text-[var(--gold)] w-5 h-5" />
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-[var(--gold)] rounded-full blur-md"
                  />
                </div>
                <span className="font-display text-xl text-[var(--gold)]">💰 {countingCoins.toLocaleString()}</span>
              </motion.div>
            )}

            {/* Items Grid */}
            <div className="grid grid-cols-1 gap-2">
              <AnimatePresence>
                {rewardDetails.filter(d => revealedItems.includes(d.id)).map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ x: -20, opacity: 0, scale: 0.9 }}
                    animate={{ x: 0, opacity: 1, scale: 1 }}
                    className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/10 group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-black/60 flex items-center justify-center border border-white/5 shadow-inner">
                      {item.type === 'item' && <Sword size={20} className="text-blue-400" />}
                      {item.type === 'booster' && <Sparkles size={20} className="text-purple-400" />}
                      {item.type === 'skill' && <Wand2 size={20} className="text-[var(--rarity-gold)]" />}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-display text-xs truncate" style={{ color: RARITY_COLOR[item.rarity as Rarity] }}>{item.name}</p>
                      <p className="text-[8px] uppercase tracking-widest text-muted-foreground">{item.type}</p>
                    </div>
                    <div className="text-[var(--gold)] opacity-50">
                      <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
                        <Sparkles size={12} />
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <button
          onClick={handleAccept}
          disabled={isAnimating}
          className={`btn-fantasy w-full py-3 flex items-center justify-center gap-2 font-bold uppercase tracking-[0.2em] transition-all duration-500 ${
            isAnimating 
              ? 'bg-white/5 text-white/20 border-white/5 grayscale pointer-events-none' 
              : 'bg-[var(--gold)] text-black border-[var(--gold)] shadow-[0_0_25px_rgba(234,179,8,0.4)]'
          }`}
          style={!isAnimating ? { background: "var(--gradient-gold)" } : {}}
        >
          {isAnimating ? (
             <span className="animate-pulse">Calculando Botín...</span>
          ) : (
            <>
              <Check size={18} />
              ¡Entendido!
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}

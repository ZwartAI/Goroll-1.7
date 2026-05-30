import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useT } from "@/lib/i18n";
import { useGameData } from "@/lib/useGame";
import { supabase } from "@/integrations/supabase/client";
import { type RewardAssignment, acceptRewardAssignment } from "@/lib/rewards";
import { CharacterPortrait } from "@/components/app/CharacterPortrait";
import { Coins, Sparkles, Sword, Wand2, Check } from "lucide-react";
import { type Rarity, RARITY_COLOR, type Item } from "@/lib/game";

export function PlayerRewardModal() {
  const { character, campaign, items: allItems } = useGameData();
  const [pendingRewards, setPendingRewards] = useState<RewardAssignment[]>([]);
  const [countingCoins, setCoins] = useState(0);
  const [revealedIds, setRevealedIds] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const { t } = useT();

  const currentReward = pendingRewards[0] || null;

  const fetchPending = useCallback(async () => {
    if (!character?.id) return;
    const { data } = await supabase
      .from("reward_assignments")
      .select("*")
      .eq("character_id", character.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    
    if (data) setPendingRewards(data as RewardAssignment[]);
  }, [character?.id]);

  // Listen for new rewards
  useEffect(() => {
    if (!character?.id || !campaign?.id) return;

    fetchPending();

    const channel = supabase.channel(`rewards:${character.id}`)
      .on("postgres_changes", { 
        event: "INSERT", 
        schema: "public", 
        table: "reward_assignments", 
        filter: `character_id=eq.${character.id}` 
      }, (payload) => {
        if (payload.new.status === 'pending') {
          setPendingRewards(prev => [...prev, payload.new as RewardAssignment]);
        }
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "reward_assignments",
        filter: `character_id=eq.${character.id}`
      }, (payload) => {
        if (payload.new.status === 'accepted') {
          setPendingRewards(prev => prev.filter(r => r.id !== payload.new.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [character?.id, campaign?.id, fetchPending]);

  // Start animation sequence when a reward appears
  useEffect(() => {
    if (currentReward && !isAnimating && revealedIds.length === 0 && countingCoins === 0) {
      startSequence();
    }
  }, [currentReward, isAnimating, revealedIds.length, countingCoins]);

  const startSequence = async () => {
    setIsAnimating(true);
    
    // 1. Coins animation
    if (currentReward && currentReward.coins > 0) {
      await new Promise(r => setTimeout(r, 800));
      let current = 0;
      const target = currentReward.coins;
      const duration = 1500;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuad = (t: number) => t * (2 - t);
        const value = Math.floor(easeOutQuad(progress) * target);
        
        setCoins(value);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
      await new Promise(r => setTimeout(r, duration + 200));
    }

    // 2. Items/Boosters revelation one by one
    const allIds = [
      ...(currentReward?.item_ids || []),
      ...(currentReward?.booster_ids || []),
      ...(currentReward?.skill_ids || [])
    ];

    for (const id of allIds) {
      await new Promise(r => setTimeout(r, 700));
      setRevealedIds(prev => [...prev, id]);
    }

    await new Promise(r => setTimeout(r, 300));
    setIsAnimating(false);
  };

  const handleAccept = async () => {
    if (!currentReward) return;
    try {
      await acceptRewardAssignment(currentReward.id);
      // The state will be updated by the realtime listener or manually here to be faster
      setPendingRewards(prev => prev.slice(1));
      setCoins(0);
      setRevealedIds([]);
      setIsAnimating(false);
    } catch (e) {
      console.error(e);
    }
  };

  const rewardDetails = useMemo(() => {
    if (!currentReward) return [];
    
    const details: any[] = [];
    
    currentReward.item_ids.forEach(id => {
      const it = allItems.find(i => i.id === id);
      if (it) details.push({ id, name: it.name, rarity: it.rarity, type: 'item' });
      else details.push({ id, name: "Objeto Especial", rarity: 'blue', type: 'item' });
    });

    currentReward.booster_ids.forEach(id => {
      details.push({ id, name: "Potenciador", rarity: 'purple', type: 'booster' });
    });

    currentReward.skill_ids.forEach(id => {
      details.push({ id, name: "Habilidad", rarity: 'gold', type: 'skill' });
    });

    return details;
  }, [currentReward, allItems]);

  if (!currentReward) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0, rotateX: 45 }}
        animate={{ scale: 1, opacity: 1, rotateX: 0 }}
        className="ornate-card w-full max-w-md bg-[#0a0a0c] p-6 relative overflow-hidden flex flex-col items-center text-center shadow-[0_0_80px_rgba(0,0,0,1)] border-2"
        style={{ borderColor: "var(--gold)" }}
      >
        {/* Fantasy Glow Effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[var(--gold)]/10 rounded-full blur-[100px]" />
          <motion.div 
            animate={{ 
              opacity: [0.1, 0.3, 0.1],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute inset-0 bg-gradient-to-b from-[var(--gold)]/5 to-transparent"
          />
        </div>

        {/* Character Avatar */}
        <motion.div 
          initial={{ y: -30, opacity: 0, scale: 0.5 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 12, delay: 0.2 }}
          className="relative w-32 h-32 rounded-full border-4 border-[var(--gold)] shadow-[0_0_40px_rgba(234,179,8,0.4)] mb-6 overflow-hidden bg-black z-10"
        >
          <CharacterPortrait character={character as any} className="w-full h-full object-cover" />
          <div className="absolute inset-0 border border-white/20 rounded-full pointer-events-none" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="z-10"
        >
          <h2 className="font-display text-3xl uppercase tracking-[0.25em] text-[var(--gold)] drop-shadow-[0_0_15px_rgba(234,179,8,0.6)] mb-1">
            ¡Botín Obtenido!
          </h2>
          <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-6 opacity-60">Recompensas de aventura</p>
        </motion.div>

        {/* Rewards Section */}
        <div className="w-full bg-black/80 border border-white/10 rounded-3xl p-6 mb-8 space-y-5 min-h-[14rem] flex flex-col justify-start relative z-10 shadow-inner">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-3xl pointer-events-none" />
          
          <div className="space-y-4">
            {/* Coins */}
            {currentReward.coins > 0 && (
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-1"
              >
                <div className="relative mb-1">
                  <Coins className="text-[var(--gold)] w-8 h-8" />
                  <motion.div 
                    animate={{ scale: [1, 2, 1], opacity: [0, 0.5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 bg-[var(--gold)] rounded-full blur-xl"
                  />
                </div>
                <span className="font-display text-3xl text-[var(--gold)] drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]">
                  {countingCoins.toLocaleString()}
                </span>
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Monedas de Oro</span>
              </motion.div>
            )}

            {/* Items Grid */}
            <div className="grid grid-cols-1 gap-2.5">
              <AnimatePresence mode="popLayout">
                {rewardDetails.filter(d => revealedIds.includes(d.id)).map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ x: -30, opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                    animate={{ x: 0, opacity: 1, scale: 1, filter: "blur(0px)" }}
                    className="flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/10 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--gold)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div 
                      className="w-12 h-12 rounded-xl bg-black/60 flex items-center justify-center border border-white/10 shadow-xl shrink-0 overflow-hidden"
                      style={{ boxShadow: `0 0 15px ${RARITY_COLOR[item.rarity as Rarity]}22` }}
                    >
                      {item.type === 'item' && <Sword size={24} className="text-blue-400" />}
                      {item.type === 'booster' && <Sparkles size={24} className="text-purple-400" />}
                      {item.type === 'skill' && <Wand2 size={24} className="text-[var(--rarity-gold)]" />}
                    </div>

                    <div className="flex-1 text-left min-w-0">
                      <p className="font-display text-sm truncate" style={{ color: RARITY_COLOR[item.rarity as Rarity] }}>{item.name}</p>
                      <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground opacity-50">{item.type}</p>
                    </div>
                    
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="text-[var(--gold)] shrink-0"
                    >
                      <Sparkles size={14} />
                    </motion.div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <button
          onClick={handleAccept}
          disabled={isAnimating}
          className={`btn-fantasy w-full py-4 flex items-center justify-center gap-3 font-bold uppercase tracking-[0.3em] transition-all duration-500 relative z-10 ${
            isAnimating 
              ? 'bg-white/5 text-white/20 border-white/5 grayscale pointer-events-none scale-95' 
              : 'bg-[var(--gold)] text-black border-[var(--gold)] shadow-[0_0_40px_rgba(234,179,8,0.5)] hover:scale-[1.02] active:scale-95'
          }`}
          style={!isAnimating ? { background: "var(--gradient-gold)" } : {}}
        >
          {isAnimating ? (
             <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                <span className="text-xs">Identificando Objetos...</span>
             </div>
          ) : (
            <>
              <Check size={20} />
              Reclamar Botín
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}


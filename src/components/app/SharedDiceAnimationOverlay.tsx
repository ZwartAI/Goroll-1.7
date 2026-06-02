import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useGameData } from '@/lib/useGame';

export interface DieRoll {
  id: string;
  type: string;
  result: number;
  sides: number;
  x: number;
  y: number;
}

interface SharedDiceRoll {
  id: string;
  character_id: string;
  dice_data: DieRoll[];
  total: number;
  character_name?: string;
  character_color?: string;
}

const RouletteNumber = ({ sides }: { sides: number }) => {
  const [num, setNum] = useState(1);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setNum(Math.floor(Math.random() * sides) + 1);
    }, 80);
    return () => clearInterval(interval);
  }, [sides]);

  return <span className="blur-[1px] opacity-60">{num}</span>;
};

export const SharedDiceAnimationOverlay: React.FC = () => {
  const { campaign, characters } = useGameData();
  const [activeRoll, setActiveRoll] = useState<SharedDiceRoll | null>(null);
  const [phase, setPhase] = useState<'rolling' | 'result'>('rolling');

  useEffect(() => {
    if (!campaign?.id) return;

    const channel = supabase
      .channel('shared-dice-rolls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dice_rolls',
          filter: `campaign_id=eq.${campaign.id}`,
        },
        async (payload) => {
          const newRoll = payload.new;
          
          // Find character info for the name/color display
          const char = characters.find(c => c.id === newRoll.character_id);
          
          const rollData: SharedDiceRoll = {
            id: newRoll.id,
            character_id: newRoll.character_id,
            dice_data: newRoll.dice_data as DieRoll[],
            total: newRoll.total,
            character_name: char?.name || 'Alguien',
            character_color: char?.color || 'var(--gold)',
          };

          // Trigger animation
          setPhase('rolling');
          setActiveRoll(rollData);

          // Phase transition
          setTimeout(() => {
            setPhase('result');
            // Auto-clear after showing result
            setTimeout(() => {
              setActiveRoll(null);
            }, 4000);
          }, 1500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaign?.id, characters]);

  if (!activeRoll) return null;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center overflow-hidden bg-black/20 backdrop-blur-[2px]">
      <div className="relative w-full h-full max-w-2xl mx-auto flex items-center justify-center">
        
        {/* Character Name Tag */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute top-24 px-4 py-1.5 rounded-full bg-black/80 border border-white/10 backdrop-blur-xl flex items-center gap-2 shadow-2xl"
          style={{ borderColor: `${activeRoll.character_color}40` }}
        >
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: activeRoll.character_color }} />
          <span className="font-display text-[10px] uppercase tracking-[0.2em] text-white/90">
            {activeRoll.character_name} lanzando...
          </span>
        </motion.div>

        {/* Dice Animation */}
        <div className="relative w-full h-full">
          <AnimatePresence>
            {activeRoll.dice_data.map((die) => (
              <motion.div
                key={die.id}
                initial={{ scale: 0, opacity: 0, rotate: -360 }}
                animate={{ 
                  scale: phase === 'rolling' ? 1.1 : 1, 
                  opacity: 1, 
                  rotate: phase === 'rolling' ? [0, 90, 180, 270, 360] : 0,
                  x: die.x * 0.8,
                  y: die.y * 0.8 
                }}
                transition={{ 
                  rotate: phase === 'rolling' ? { repeat: Infinity, duration: 0.5, ease: "linear" } : { type: "spring" }
                }}
                className="absolute left-1/2 top-1/2 -ml-8 -mt-8 w-16 h-16 flex flex-col items-center justify-center"
              >
                <div className="relative w-full h-full flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/90 rounded-2xl border border-[var(--gold)]/50 shadow-[0_0_20px_rgba(234,179,8,0.3)] backdrop-blur-md" 
                       style={{ borderColor: `${activeRoll.character_color}80` }} />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl" />
                  
                  <div className="relative z-10 font-display text-2xl font-black text-[var(--gold)] drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]"
                       style={{ color: activeRoll.character_color }}>
                    {phase === 'rolling' ? (
                      <RouletteNumber sides={die.sides} />
                    ) : (
                      <motion.span
                        initial={{ scale: 1.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        {die.result}
                      </motion.span>
                    )}
                  </div>
                  
                  <div className="absolute -bottom-1.5 px-1.5 py-0.5 bg-black border border-white/10 text-[var(--gold)] rounded font-display text-[6px] font-bold uppercase tracking-[0.2em] z-20">
                    {die.type}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Total Result */}
        {phase === 'result' && (
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            className="absolute bottom-32 left-0 right-0 flex flex-col items-center gap-1"
          >
            <span className="font-display text-[9px] uppercase tracking-[0.4em] text-[var(--gold)] opacity-70"
                  style={{ color: activeRoll.character_color }}>
              Resultado Total
            </span>
            <div className="bg-black/95 backdrop-blur-2xl border border-[var(--gold)]/40 px-10 py-3 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(234,179,8,0.15)]"
                 style={{ borderColor: `${activeRoll.character_color}60` }}>
              <span className="font-display text-5xl font-black text-[var(--gold)] drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]"
                    style={{ color: activeRoll.character_color }}>
                {activeRoll.total}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

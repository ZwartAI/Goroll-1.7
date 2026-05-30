import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// FASE 6: 3D-Style Dice Roulette Animation
interface DieRoll {
  id: string;
  type: string;
  result: number;
  sides: number;
  x: number;
  y: number;
}

interface Props {
  dice: DieRoll[];
  onComplete: () => void;
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

export const BattleMapDiceAnimation: React.FC<Props> = ({ dice, onComplete }) => {
  const [phase, setPhase] = useState<'rolling' | 'result'>('rolling');
  const total = useMemo(() => dice.reduce((acc, d) => acc + d.result, 0), [dice]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase('result');
      setTimeout(onComplete, 4000); // Wait after showing result
    }, 2000); // 2 seconds of rolling
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="absolute inset-0 z-[100] pointer-events-none flex items-center justify-center overflow-hidden">
      <div className="relative w-full h-full max-w-4xl mx-auto">
        {/* Los dados se reparten en pantalla */}
        <AnimatePresence>
          {dice.map((die) => (
            <motion.div
              key={die.id}
              initial={{ scale: 0, opacity: 0, rotate: -180 }}
              animate={{ 
                scale: phase === 'rolling' ? 1.2 : 1, 
                opacity: 1, 
                rotate: 0,
                x: die.x, 
                y: die.y 
              }}
              className="absolute left-1/2 top-1/2 -ml-12 -mt-12 w-24 h-24 flex flex-col items-center justify-center"
            >
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Estilo visual del dado (Pseudo-3D) */}
                <div className="absolute inset-0 bg-black/60 rounded-3xl border-2 border-[var(--gold)] shadow-[0_0_30px_rgba(234,179,8,0.4)] backdrop-blur-md transform rotate-12" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl" />
                
                <div className="relative z-10 font-display text-4xl font-black text-[var(--gold)] drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]">
                  {phase === 'rolling' ? (
                    <RouletteNumber sides={die.sides} />
                  ) : (
                    <motion.span
                      initial={{ scale: 2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    >
                      {die.result}
                    </motion.span>
                  )}
                </div>
                
                {/* Etiqueta del tipo de dado */}
                <div className="absolute -bottom-2 px-2 py-0.5 bg-[var(--gold)] text-black rounded font-display text-[8px] font-bold uppercase tracking-widest z-20">
                  {die.type}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Suma total final */}
        {phase === 'result' && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-20 left-0 right-0 flex flex-col items-center gap-2"
          >
            <span className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">TOTAL</span>
            <div className="bg-black/80 backdrop-blur-md border border-[var(--gold)]/30 px-10 py-4 rounded-full shadow-[0_0_50px_rgba(234,179,8,0.2)]">
              <span className="font-display text-6xl font-black text-[var(--gold)] drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]">
                {total}
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Overlay de brillo general durante el giro */}
      <motion.div 
        animate={{ opacity: phase === 'rolling' ? 0.3 : 0 }}
        className="absolute inset-0 bg-[var(--gold)]/10 mix-blend-overlay"
      />
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// FASE 8: Refined Dice Animation
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
      setTimeout(onComplete, 3500); // Duración total optimizada
    }, 1500); // Rodando por 1.5s
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="absolute inset-0 z-[100] pointer-events-none flex items-center justify-center overflow-hidden bg-black/10 backdrop-blur-[1px]">
      <div className="relative w-full h-full max-w-2xl mx-auto">
        {/* Dados refinados */}
        <AnimatePresence>
          {dice.map((die) => (
            <motion.div
              key={die.id}
              initial={{ scale: 0, opacity: 0, rotate: -360 }}
              animate={{ 
                scale: phase === 'rolling' ? 1.1 : 1, 
                opacity: 1, 
                rotate: phase === 'rolling' ? [0, 90, 180, 270, 360] : 0,
                x: die.x * 0.8, // Escala de dispersión reducida
                y: die.y * 0.8 
              }}
              transition={{ 
                rotate: phase === 'rolling' ? { repeat: Infinity, duration: 0.5, ease: "linear" } : { type: "spring" }
              }}
              className="absolute left-1/2 top-1/2 -ml-8 -mt-8 w-16 h-16 flex flex-col items-center justify-center"
            >
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Estilo visual más elegante */}
                <div className="absolute inset-0 bg-black/80 rounded-2xl border border-[var(--gold)]/50 shadow-[0_0_20px_rgba(234,179,8,0.3)] backdrop-blur-md" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl" />
                
                <div className="relative z-10 font-display text-2xl font-black text-[var(--gold)] drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]">
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
                
                {/* Etiqueta compacta */}
                <div className="absolute -bottom-1.5 px-1.5 py-0.5 bg-[var(--gold)] text-black rounded font-display text-[6px] font-bold uppercase tracking-[0.2em] z-20">
                  {die.type}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Suma total final compacta */}
        {phase === 'result' && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-24 left-0 right-0 flex flex-col items-center gap-1"
          >
            <span className="font-display text-[8px] uppercase tracking-[0.4em] text-[var(--gold)] opacity-70">Resultado Total</span>
            <div className="bg-black/90 backdrop-blur-xl border border-[var(--gold)]/40 px-6 py-2 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(234,179,8,0.1)]">
              <span className="font-display text-4xl font-black text-[var(--gold)] drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]">
                {total}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

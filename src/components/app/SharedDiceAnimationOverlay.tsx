import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useGameData } from '@/lib/useGame';
import { useT } from '@/lib/i18n';

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

type Phase = 'rolling' | 'result';

// ── SVG dice shapes (one symbol per die type) ──────────────────────────────────
const DiceShape: React.FC<{ sides: number; color: string; children: React.ReactNode }> = ({
  sides,
  color,
  children,
}) => {
  const stroke = color;
  const fill = `color-mix(in oklab, ${color} 18%, #0a0a0c 82%)`;
  const inner = `color-mix(in oklab, ${color} 35%, transparent)`;

  const path = (() => {
    switch (sides) {
      case 4: // triangle
        return 'M50 6 L94 86 L6 86 Z';
      case 6: // square
        return 'M14 14 H86 V86 H14 Z';
      case 8: // rhombus
        return 'M50 4 L92 50 L50 96 L8 50 Z';
      case 10: // pentagon
        return 'M50 6 L94 36 L78 88 L22 88 L6 36 Z';
      case 12: // hexagon
        return 'M50 4 L90 26 L90 74 L50 96 L10 74 L10 26 Z';
      case 20: // icosahedron silhouette (hex + inner triangle)
        return 'M50 4 L90 28 L90 72 L50 96 L10 72 L10 28 Z';
      case 100: // double decagon
        return 'M50 4 L80 14 L94 40 L88 72 L62 94 L38 94 L12 72 L6 40 L20 14 Z';
      default:
        return 'M14 14 H86 V86 H14 Z';
    }
  })();

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]">
      <defs>
        <radialGradient id={`g-${sides}`} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor={inner} stopOpacity="0.9" />
          <stop offset="100%" stopColor={fill} stopOpacity="1" />
        </radialGradient>
      </defs>
      <path d={path} fill={`url(#g-${sides})`} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
      {sides === 20 && (
        <path
          d="M50 18 L78 70 L22 70 Z"
          fill="none"
          stroke={stroke}
          strokeOpacity="0.45"
          strokeWidth="1.2"
        />
      )}
      {sides === 12 && (
        <path
          d="M50 22 L74 36 L74 64 L50 78 L26 64 L26 36 Z"
          fill="none"
          stroke={stroke}
          strokeOpacity="0.35"
          strokeWidth="1"
        />
      )}
      <foreignObject x="0" y="0" width="100" height="100">
        <div
          // @ts-expect-error xmlns for foreignObject
          xmlns="http://www.w3.org/1999/xhtml"
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-display, serif)',
            fontWeight: 900,
            fontSize: sides === 100 ? 22 : 30,
            color,
            textShadow: `0 0 12px ${color}80`,
          }}
        >
          {children}
        </div>
      </foreignObject>
    </svg>
  );
};

const RouletteNumber: React.FC<{ sides: number }> = ({ sides }) => {
  const [num, setNum] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setNum(Math.floor(Math.random() * sides) + 1), 70);
    return () => clearInterval(id);
  }, [sides]);
  return <span style={{ filter: 'blur(0.5px)', opacity: 0.85 }}>{num}</span>;
};

const sidesOf = (type: string): number => {
  const n = parseInt(String(type).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 20;
};

const groupBreakdown = (dice: DieRoll[]) => {
  const groups: Record<string, number> = {};
  dice.forEach((d) => {
    const key = d.type?.toLowerCase() || `d${d.sides}`;
    groups[key] = (groups[key] || 0) + 1;
  });
  return Object.entries(groups)
    .map(([k, v]) => `${v}${k}`)
    .join(' + ');
};

export const SharedDiceAnimationOverlay: React.FC = () => {
  const { campaign, characters } = useGameData();
  const { t } = useT();
  const [activeRoll, setActiveRoll] = useState<SharedDiceRoll | null>(null);
  const [phase, setPhase] = useState<Phase>('rolling');

  useEffect(() => {
    if (!campaign?.id) return;
    const channel = supabase
      .channel('shared-dice-rolls')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dice_rolls', filter: `campaign_id=eq.${campaign.id}` },
        (payload) => {
          const newRoll = payload.new as any;
          const char = characters.find((c) => c.id === newRoll.character_id);
          const rollData: SharedDiceRoll = {
            id: newRoll.id,
            character_id: newRoll.character_id,
            dice_data: (newRoll.dice_data as DieRoll[]).map((d) => ({ ...d, sides: d.sides || sidesOf(d.type) })),
            total: newRoll.total,
            character_name: char?.name || '—',
            character_color: char?.color || 'var(--gold)',
          };

          setPhase('rolling');
          setActiveRoll(rollData);

          const t1 = setTimeout(() => setPhase('result'), 1400);
          const t2 = setTimeout(() => setActiveRoll(null), 5200);
          return () => {
            clearTimeout(t1);
            clearTimeout(t2);
          };
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaign?.id, characters]);

  if (!activeRoll) return null;

  const color = activeRoll.character_color || 'var(--gold)';
  const dice = activeRoll.dice_data;
  const count = dice.length;

  // Detect crit on a single d20 roll
  const isSingleD20 = count === 1 && dice[0].sides === 20;
  const isCrit = isSingleD20 && dice[0].result === 20;
  const isFumble = isSingleD20 && dice[0].result === 1;

  return (
    <AnimatePresence>
      <motion.div
        key={activeRoll.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.85) 70%, rgba(0,0,0,0.95) 100%)',
          backdropFilter: 'blur(3px)',
        }}
      >
        {/* Close (local only) */}
        <button
          onClick={() => setActiveRoll(null)}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/70 border border-white/15 text-white/80 hover:text-white hover:scale-110 transition pointer-events-auto flex items-center justify-center"
          aria-label={t('diceCast.close')}
        >
          <X size={16} />
        </button>

        {/* Caster tag */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="absolute top-16 px-5 py-2 rounded-full bg-black/85 backdrop-blur-xl flex items-center gap-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
          style={{ border: `1px solid ${color}55` }}
        >
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
          <span
            className="font-display text-[11px] uppercase tracking-[0.22em] text-white/95"
            style={{ textShadow: `0 0 8px ${color}50` }}
          >
            {t('diceCast.rolling', { name: activeRoll.character_name || '—' })}
          </span>
        </motion.div>

        {/* Aura behind dice */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{
            scale: phase === 'result' ? 1.15 : 1,
            opacity: phase === 'result' ? 0.5 : 0.3,
          }}
          transition={{ duration: 0.6 }}
          className="absolute w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${isCrit ? 'var(--gold,#eab308)' : isFumble ? '#ef4444' : color} 0%, transparent 65%)`,
            filter: 'blur(40px)',
          }}
        />

        {/* Dice cluster */}
        <div className="relative flex items-center justify-center gap-3 flex-wrap max-w-[80vw] px-4">
          {dice.map((die, idx) => {
            const angle = (idx - (count - 1) / 2) * 14;
            return (
              <motion.div
                key={die.id}
                initial={{
                  scale: 0,
                  opacity: 0,
                  y: -180,
                  x: (idx % 2 === 0 ? -1 : 1) * (120 + idx * 40),
                  rotate: -540,
                }}
                animate={{
                  scale: phase === 'rolling' ? 1 : 1.05,
                  opacity: 1,
                  y: 0,
                  x: 0,
                  rotate: phase === 'rolling' ? [0, 180, 360, 540, 720] : angle,
                }}
                transition={{
                  delay: idx * 0.08,
                  duration: phase === 'rolling' ? 1.3 : 0.5,
                  rotate:
                    phase === 'rolling'
                      ? { repeat: Infinity, duration: 0.55, ease: 'linear' }
                      : { type: 'spring', stiffness: 220, damping: 14 },
                  scale: { type: 'spring', stiffness: 180, damping: 12 },
                }}
                className="relative"
                style={{ width: count > 4 ? 76 : 96, height: count > 4 ? 76 : 96 }}
              >
                <DiceShape sides={die.sides} color={color}>
                  {phase === 'rolling' ? (
                    <RouletteNumber sides={die.sides} />
                  ) : (
                    <motion.span
                      initial={{ scale: 1.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 12 }}
                    >
                      {die.result}
                    </motion.span>
                  )}
                </DiceShape>

                {/* Type badge */}
                <div
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-black/90 rounded text-[8px] font-display font-bold uppercase tracking-[0.18em]"
                  style={{ color, border: `1px solid ${color}40` }}
                >
                  {die.type || `d${die.sides}`}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Result section */}
        <AnimatePresence>
          {phase === 'result' && (
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 240, damping: 18 }}
              className="absolute bottom-20 left-0 right-0 flex flex-col items-center gap-2"
            >
              {(isCrit || isFumble) && (
                <motion.span
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="font-display text-[11px] uppercase tracking-[0.4em] font-bold"
                  style={{
                    color: isCrit ? 'var(--gold, #eab308)' : '#ef4444',
                    textShadow: `0 0 14px ${isCrit ? '#eab308' : '#ef4444'}99`,
                  }}
                >
                  {isCrit ? t('diceCast.critSuccess') : t('diceCast.critFail')}
                </motion.span>
              )}

              <span
                className="font-display text-[9px] uppercase tracking-[0.45em] opacity-80"
                style={{ color }}
              >
                {t('diceCast.total')}
              </span>

              <div
                className="bg-black/95 backdrop-blur-2xl px-12 py-3 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)]"
                style={{
                  border: `1px solid ${color}70`,
                  boxShadow: `0 20px 60px rgba(0,0,0,0.9), 0 0 30px ${color}30`,
                }}
              >
                <span
                  className="font-display text-6xl font-black tabular-nums"
                  style={{ color, textShadow: `0 0 24px ${color}80` }}
                >
                  {activeRoll.total}
                </span>
              </div>

              {count > 1 && (
                <div className="mt-1 flex flex-col items-center gap-0.5">
                  <span className="text-[9px] uppercase tracking-[0.3em] text-white/50 font-display">
                    {groupBreakdown(dice)}
                  </span>
                  <span className="text-[10px] text-white/70 font-mono">
                    {dice.map((d) => d.result).join(' + ')} = {activeRoll.total}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

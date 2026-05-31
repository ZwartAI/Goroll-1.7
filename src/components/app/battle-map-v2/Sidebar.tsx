import React from 'react';
import { useGameData } from '@/lib/useGame';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Props {
  onOpenChar: (id: string) => void;
}

export function Sidebar({ onOpenChar }: Props) {
  const { combat, characters } = useGameData();
  
  // Use combat participants if active, otherwise just online characters
  const participants = combat.encounter?.status === 'active' 
    ? combat.participants.map((p, idx) => {
        const char = characters.find(c => c.id === p.character_id);
        const currentHp = p.participant_type === 'enemy' ? (p.enemy_hp ?? 0) : (char?.current_hp ?? 0);
        const maxHp = p.participant_type === 'enemy' ? (p.enemy_max_hp ?? 1) : (char?.base_hp ?? 1);
        
        return {
          id: p.id,
          characterId: p.character_id,
          name: p.display_name,
          color: p.color,
          image_url: p.image_url,
          is_turn: combat.encounter?.current_turn_index === idx,
          hp_percent: (currentHp / maxHp) * 100
        };
      })
    : characters.filter(c => c.role !== 'dm').map(c => ({
        id: c.id,
        characterId: c.id,
        name: c.name,
        color: c.color,
        image_url: c.image_url,
        is_turn: false,
        hp_percent: (c.current_hp / (c.base_hp || 1)) * 100
      }));

  return (
    <div className="absolute left-4 top-20 bottom-32 w-48 pointer-events-none z-20 hidden sm:flex flex-col gap-2">
      {participants.map((p, idx) => (
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: idx * 0.05 }}
          key={p.id}
          className={cn(
            "pointer-events-auto flex items-center gap-3 p-1.5 rounded-lg border backdrop-blur-md transition-all duration-300 cursor-pointer group",
            p.is_turn 
              ? "bg-[var(--gold)]/20 border-[var(--gold)] shadow-[0_0_15px_rgba(234,179,8,0.2)]" 
              : "bg-black/40 border-white/10 hover:border-white/30"
          )}
          onClick={() => p.characterId && onOpenChar(p.characterId)}
        >
          <div className="relative w-8 h-8 rounded-full border border-white/20 overflow-hidden shrink-0">
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary text-xs">🧙</div>
            )}
            {p.is_turn && (
              <div className="absolute inset-0 border-2 border-[var(--gold)] animate-pulse rounded-full" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-display uppercase tracking-wider truncate" style={{ color: p.color || 'var(--gold)' }}>
              {p.name}
            </p>
            <div className="h-1 w-full bg-black/40 rounded-full mt-1 overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500",
                  p.hp_percent > 50 ? "bg-green-500" : p.hp_percent > 20 ? "bg-yellow-500" : "bg-red-500"
                )}
                style={{ width: `${Math.max(0, Math.min(100, p.hp_percent))}%` }}
              />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

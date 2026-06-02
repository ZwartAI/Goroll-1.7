import React, { useMemo } from 'react';
import { useGameData } from '@/lib/useGame';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { UserPlus, UserMinus } from 'lucide-react';
import { buildOrderedTurns } from '@/lib/combat';

interface Props {
  onOpenChar: (id: string) => void;
  battleMap: any;
  isDM: boolean;
  onInitiatePlacement: (token: any) => void;
}

export function Sidebar({ onOpenChar, battleMap, isDM, onInitiatePlacement }: Props) {
  const { combat, characters } = useGameData();
  const { tokens, addToken, removeToken, activeScene } = battleMap;
  
  const blocks = useMemo(() => {
    if (combat.encounter?.status === 'active') {
      return buildOrderedTurns(combat.participants, combat.groups, combat.pins || []);
    }
    return [];
  }, [combat.encounter?.status, combat.participants, combat.groups, combat.pins]);

  // Use combat participants if active, otherwise just online characters
  const participants = useMemo(() => {
    if (combat.encounter?.status === 'active') {
      return blocks.flatMap((block, bIdx) => {
        const isTurn = combat.encounter?.current_turn_index === bIdx;
        
        if (block.kind === 'solo') {
          const p = block.participant;
          const char = characters.find(c => c.id === p.character_id);
          const currentHp = p.participant_type === 'enemy' ? (p.enemy_hp ?? 0) : (char?.current_hp ?? 0);
          const maxHp = p.participant_type === 'enemy' ? (p.enemy_max_hp ?? 1) : (char?.base_hp ?? 1);
          
          return [{
            id: p.id,
            characterId: p.character_id,
            name: p.display_name,
            color: p.color,
            image_url: p.image_url,
            is_turn: isTurn,
            hp_percent: (currentHp / maxHp) * 100,
            type: p.participant_type,
            original: p
          }];
        }
        
        if (block.kind === 'group') {
          return block.members.map(p => {
            const char = characters.find(c => c.id === p.character_id);
            const currentHp = p.participant_type === 'enemy' ? (p.enemy_hp ?? 0) : (char?.current_hp ?? 0);
            const maxHp = p.participant_type === 'enemy' ? (p.enemy_max_hp ?? 1) : (char?.base_hp ?? 1);
            
            return {
              id: p.id,
              characterId: p.character_id,
              name: p.display_name,
              color: p.color,
              image_url: p.image_url,
              is_turn: isTurn,
              hp_percent: (currentHp / maxHp) * 100,
              type: p.participant_type,
              original: p
            };
          });
        }
        
        if (block.kind === 'pin') {
          const p = block.linked;
          const char = characters.find(c => c.id === p.character_id);
          const currentHp = p.participant_type === 'enemy' ? (p.enemy_hp ?? 0) : (char?.current_hp ?? 0);
          const maxHp = p.participant_type === 'enemy' ? (p.enemy_max_hp ?? 1) : (char?.base_hp ?? 1);
          
          return [{
            id: `pin-${block.pin.id}`,
            characterId: p.character_id,
            name: block.pin.label || p.display_name,
            color: p.color,
            image_url: p.image_url,
            is_turn: isTurn,
            hp_percent: (currentHp / maxHp) * 100,
            type: p.participant_type,
            original: p
          }];
        }
        
        return [];
      });
    }
    
    return characters.filter(c => c.role !== 'dm').map(c => ({
      id: c.id,
      characterId: c.id,
      name: c.name,
      color: c.color,
      image_url: c.image_url,
      is_turn: false,
      hp_percent: (c.current_hp / (c.base_hp || 1)) * 100,
      type: 'player',
      original: c
    }));
  }, [combat.encounter, blocks, characters]);

  const handleToggleToken = (p: any) => {
    if (!activeScene) return;
    
    // Check if token already exists for this participant/character
    const existingToken = tokens.find((t: any) => 
      (p.characterId && t.character_id === p.characterId) || 
      (!p.characterId && t.name === p.name)
    );

    if (existingToken) {
      removeToken(existingToken.id);
    } else {
      const isEnemy = p.type === 'enemy';
      const original = p.original;
      
      onInitiatePlacement({
        character_id: p.characterId || null,
        name: p.name,
        image_url: p.image_url,
        token_type: isEnemy ? 'enemy' : 'player',
        image_scale: isEnemy ? (original.enemy_image_scale || 1) : (original.image_scale || 1),
        image_offset_x: isEnemy ? (original.enemy_image_offset_x ?? 50) : (original.image_offset_x ?? 50),
        image_offset_y: isEnemy ? (original.enemy_image_offset_y ?? 50) : (original.image_offset_y ?? 50),
      });
    }
  };

  return (
    <div className="absolute left-4 top-20 bottom-32 w-48 pointer-events-none z-20 hidden sm:flex flex-col gap-2" data-map-ui="true">
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

          {/* DM Action to toggle token */}
          {isDM && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleToken(p);
              }}
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100",
                tokens.some((t: any) => (p.characterId && t.character_id === p.characterId) || (!p.characterId && t.name === p.name))
                  ? "bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white"
                  : "bg-green-500/20 text-green-500 hover:bg-green-500 hover:text-white"
              )}
            >
              {tokens.some((t: any) => (p.characterId && t.character_id === p.characterId) || (!p.characterId && t.name === p.name))
                ? <UserMinus className="w-3.5 h-3.5" />
                : <UserPlus className="w-3.5 h-3.5" />
              }
            </button>
          )}
        </motion.div>
      ))}
    </div>
  );
}

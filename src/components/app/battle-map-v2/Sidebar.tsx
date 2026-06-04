import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useGameData } from '@/lib/useGame';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, UserMinus, Trash2 } from 'lucide-react';
import { buildOrderedTurns } from '@/lib/combat';

interface Props {
  onOpenChar: (id: string) => void;
  battleMap: any;
  isDM: boolean;
  onInitiatePlacement: (token: any) => void;
  showParticipants?: boolean;
}

export function Sidebar({ onOpenChar, battleMap, isDM, onInitiatePlacement, showParticipants = true }: Props) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { combat, characters, onlineIds } = useGameData();
  const { tokens, removeToken, activeScene } = battleMap;
  const [expandedNameId, setExpandedNameId] = useState<string | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (expandedNameId && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setExpandedNameId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expandedNameId]);
  
  const blocks = useMemo(() => {
    if (combat.encounter?.status === 'active') {
      return buildOrderedTurns(combat.participants, combat.groups, combat.pins || []);
    }
    return [];
  }, [combat.encounter?.status, combat.participants, combat.groups, combat.pins]);

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
        color: p.color || null,
      });
    }
  };

  const formatDisplayName = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 1) return name;
    return `${parts[0]}...`;
  };

  if (!showParticipants) return null;

  return (
    <>
      {/* Desktop View */}
      <div className="absolute left-4 top-20 bottom-32 w-52 pointer-events-none z-20 hidden sm:flex flex-col gap-2" data-map-ui="true">
        {participants.map((p, idx) => (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: idx * 0.05 }}
            key={p.id}
            className={cn(
              "pointer-events-auto flex items-center gap-3 p-1.5 rounded-lg border backdrop-blur-md transition-all duration-300 cursor-pointer group overflow-visible",
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
            </div>

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

      {/* Mobile/Compact View */}
      <div 
        ref={sidebarRef}
        className="absolute left-4 top-20 bottom-32 pointer-events-none z-30 flex flex-col items-start gap-2 sm:hidden overflow-y-auto no-scrollbar pr-40" 
        data-map-ui="true"
      >
        {participants.map((p, idx) => {
          const isExpanded = expandedNameId === p.id;
          return (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={`mobile-${p.id}`}
              className={cn(
                "pointer-events-auto relative flex items-center gap-1.5 px-2 py-1 rounded-full border backdrop-blur-lg transition-all duration-300 shadow-lg overflow-visible",
                p.is_turn 
                  ? "bg-[var(--gold)] text-black border-[var(--gold)] scale-110 z-10" 
                  : "bg-black/60 border-[var(--gold)]/30 text-[var(--gold)]"
              )}
              onClick={() => setExpandedNameId(isExpanded ? null : p.id)}
            >
              <div className={cn(
                "w-4 h-4 rounded-full border overflow-hidden shrink-0",
                p.is_turn ? "border-black/20" : "border-[var(--gold)]/40"
              )}>
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary text-[8px]">🧙</div>
                )}
              </div>
              
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-tight whitespace-nowrap",
                p.is_turn ? "text-black" : ""
              )} style={!p.is_turn ? { color: p.color || 'var(--gold)' } : {}}>
                {isExpanded ? p.name : formatDisplayName(p.name)}
              </span>

              {p.is_turn && (
                <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
              )}
              
              <AnimatePresence>
                {/* Float card removed as per requirements - only expanding name is kept */}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}

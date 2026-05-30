import React, { useState } from 'react';
import { Crown, Pin, Users, ChevronRight } from 'lucide-react';
import { type TurnBlock, isEnemy } from '@/lib/combat';
import { useT } from '@/lib/i18n';

interface Props {
  blocks: TurnBlock[];
  activeBlockIndex: number;
  onItemClick?: (block: TurnBlock) => void;
}

export const BattleMapTurnRail: React.FC<Props> = ({ blocks, activeBlockIndex, onItemClick }) => {
  return (
    <div className="absolute left-2 top-24 z-[60] flex flex-col gap-2 pointer-events-none max-h-[60vh] overflow-y-auto pr-8 custom-scrollbar no-scrollbar">
      {blocks.map((block, idx) => {
        const isActive = idx === activeBlockIndex;
        return (
          <TurnRailItem 
            key={block.key} 
            block={block} 
            isActive={isActive} 
            onClick={() => onItemClick?.(block)}
          />
        );
      })}
    </div>
  );
};


const TurnRailItem: React.FC<{ block: TurnBlock; isActive: boolean; onClick: () => void }> = ({ block, isActive, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useT();


  const getDetails = () => {
    if (block.kind === 'solo') {
      const p = block.participant;
      const color = p.enemy_color || p.color || (p.participant_type === 'enemy' ? '#ef4444' : '#eab308');
      const name = p.display_name;
      const firstName = name.split(' ')[0];
      return { color, name, firstName, icon: p.participant_type === 'player' ? null : <Pin className="w-2.5 h-2.5" /> };
    }
    if (block.kind === 'group') {
      const color = block.group.color || '#eab308';
      const name = block.group.name || 'Grupo';
      const firstName = name.split(' ')[0];
      return { color, name, firstName, icon: <Users className="w-2.5 h-2.5" /> };
    }
    // Pin
    const color = block.linked.enemy_color || block.linked.color || '#eab308';
    const name = block.pin.label || `Extra: ${block.linked.display_name}`;
    const firstName = name.split(' ')[0];
    return { color, name, firstName, icon: <Pin className="w-2.5 h-2.5" /> };
  };

  const { color, name, firstName, icon } = getDetails();

  const ariaLabel = block.kind === 'solo' 
    ? (block.participant.participant_type === 'player' ? t('battleMap.openSummary', { name }) : t('battleMap.openSheet', { name }))
    : block.kind === 'group' ? t('battleMap.linkGroup', { name }) : t('battleMap.openLinkedEntity', { name });

  return (
    <button 
      type="button"
      className="pointer-events-auto flex items-center group relative h-7 outline-none select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={ariaLabel}
    >

      {/* The Colored Dot */}
      <div 
        className={`w-4 h-4 rounded-full border border-white/20 transition-all duration-300 relative z-10 flex-shrink-0 ${isActive ? 'scale-125 shadow-[0_0_10px_rgba(255,255,255,0.5)] brightness-125' : 'group-hover:scale-110'}`}
        style={{ backgroundColor: color }}
      >
        {isActive && (
          <div className="absolute inset-0 rounded-full animate-ping bg-white/40" />
        )}
      </div>

      {/* The Label (Compact/Expanded) */}
      <div 
        className={`
          ml-2 flex items-center gap-2 px-2 py-1 rounded-full transition-all duration-300 overflow-hidden
          ${isHovered || isActive ? 'bg-black/80 backdrop-blur-md border border-white/10 max-w-[250px] opacity-100 shadow-xl' : 'max-w-[80px] opacity-80'}
          ${isActive ? 'border-[var(--gold)]/40 ring-1 ring-[var(--gold)]/20' : ''}
        `}
        style={{ 
            borderColor: isHovered || isActive ? color + '40' : 'transparent',
            boxShadow: isActive ? `0 0 15px ${color}20` : 'none'
        }}
      >
        <span 
          className={`font-display text-[9px] uppercase tracking-widest whitespace-nowrap transition-all duration-300 ${isActive ? 'text-white' : 'text-muted-foreground group-hover:text-foreground'}`}
          style={{ color: isHovered || isActive ? color : undefined }}
        >
          {isHovered || isActive ? name : firstName}
        </span>

        {/* Icons on the RIGHT */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {icon && (
            <div className="text-white/40 group-hover:text-white/70">
              {icon}
            </div>
          )}
          {isActive && (
            <div className="bg-[var(--gold)]/20 p-0.5 rounded-full">
              <Crown className="w-2.5 h-2.5 text-[var(--gold)] animate-pulse" />
            </div>
          )}
        </div>
      </div>
      
      {/* Active Indicator on the RIGHT of the expanded label */}
      {(isHovered || isActive) && (
          <div className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-3 h-3 text-white/20" />
          </div>
      )}
    </div>
  );
};

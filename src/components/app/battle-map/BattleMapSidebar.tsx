import React from 'react';
import { useT } from '@/lib/i18n';
import type { CombatParticipant } from '@/lib/combat';
import { EnemyIcon, getEnemyCustomImage, getEnemyAssetUrl } from '@/components/app/EnemyIconPicker';
import { Button } from '@/components/ui/button';
import { SkipForward, ShieldAlert, HeartPulse, X } from 'lucide-react';

interface Props {
  participants: CombatParticipant[];
  isOpen: boolean;
  onOpenChar?: (id: string) => void;
  onClose?: () => void;
  isDM?: boolean;
  onNextTurn?: () => void;
  activeParticipantId?: string;
}

export const BattleMapSidebar: React.FC<Props> = ({ 
  participants, 
  isOpen, 
  onOpenChar, 
  onClose,
  isDM,
  onNextTurn,
  activeParticipantId
}) => {
  const { t } = useT();

  if (!isOpen) return null;

  return (
    <aside className="fixed inset-y-0 left-0 w-[85%] sm:w-72 bg-[#0a0a0c]/98 border-r border-white/10 flex flex-col z-[150] backdrop-blur-xl shadow-2xl transition-all animate-in slide-in-from-left duration-300">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
        <div className="flex flex-col">
          <h2 className="font-display text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">
            Turno de Combate
          </h2>
          <span className="text-[7px] text-muted-foreground uppercase tracking-widest mt-0.5">Participantes e Iniciativa</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-muted-foreground hover:text-white transition-colors">
             <X size={16} />
          </button>
        )}
      </div>

      {isDM && (
        <div className="p-3 bg-[var(--gold)]/5 border-b border-white/5 grid grid-cols-2 gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="h-8 text-[9px] border-white/10 bg-white/5 hover:bg-[var(--gold)] hover:text-black transition-all"
            onClick={onNextTurn}
          >
            <SkipForward size={12} className="mr-1.5" />
            SIGUIENTE
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="h-8 text-[9px] border-white/10 bg-white/5 hover:bg-blue-500/20 text-blue-400"
          >
            <ShieldAlert size={12} className="mr-1.5" />
            EFECTOS
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
        {participants.length === 0 && (
          <div className="text-center py-10 opacity-30">
            <span className="text-[10px] uppercase tracking-widest">Sin participantes</span>
          </div>
        )}

        {participants.map((p) => {
          const color = p.enemy_color || p.color || "var(--gold)";
          const customImg = getEnemyCustomImage(p);
          const isActive = p.id === activeParticipantId;

          return (
            <div 
              key={p.id}
              className={`
                ornate-card !p-2 flex items-center gap-3 transition-all cursor-pointer group relative overflow-hidden
                ${isActive ? 'bg-[var(--gold)]/10 border-[var(--gold)]/30 ring-1 ring-[var(--gold)]/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'bg-white/5 border-transparent hover:bg-white/10'}
              `}
              onClick={() => p.character_id && onOpenChar?.(p.character_id)}
            >
              {isActive && (
                <div className="absolute left-0 inset-y-0 w-1 bg-[var(--gold)] shadow-[2px_0_10px_rgba(234,179,8,0.5)]" />
              )}

              <div 
                className={`w-9 h-9 rounded-full border flex-shrink-0 flex items-center justify-center bg-black overflow-hidden relative ${isActive ? 'border-[var(--gold)]' : 'border-white/10'}`}
                style={{ color }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <EnemyIcon 
                    name={p.enemy_icon} 
                    size={36} 
                    fill={true} 
                    customImage={customImg} 
                  />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className={`font-display text-[10px] uppercase tracking-wider truncate ${isActive ? 'text-white' : 'text-muted-foreground'}`}>
                  {p.display_name}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[7px] font-display uppercase tracking-widest text-white/30">INI:</span>
                    <span className="text-[9px] font-display text-[var(--gold)] font-bold">{p.initiative}</span>
                  </div>
                  
                  {/* Stats rápidas (Mockup visual por ahora) */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      <HeartPulse size={8} className="text-red-500/50" />
                      <span className="text-[8px] text-muted-foreground">100%</span>
                    </div>
                  </div>
                </div>
              </div>

              {isActive && (
                <div className="animate-pulse">
                   <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] shadow-[0_0_8px_var(--gold)]" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};

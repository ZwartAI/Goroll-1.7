import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useGameData } from '@/lib/useGame';
import { useT } from '@/lib/i18n';
import type { LogRow } from '@/lib/game';
import { BattleMapHeader } from './BattleMapHeader';
import { BattleMapSidebar } from './BattleMapSidebar';
import { BattleMapStage } from './BattleMapStage';
import { BattleMapDiceButton } from './BattleMapDiceButton';
import { BattleMapLog } from './BattleMapLog';

// FASE 1: BattleMap Component Base
// Estructura modular preparada para extensiones futuras.

interface Props {
  onBack: () => void;
  logs: LogRow[];
  nameOverrides?: Record<string, { name: string; color: string }>;
  onOpenChar: (id: string) => void;
}

const BattleMap: React.FC<Props> = ({ onBack, logs, nameOverrides, onOpenChar }) => {
  const { combat, campaign } = useGameData();
  const { t } = useT();
  const [activePanel, setActivePanel] = useState<'none' | 'participants'>('none');
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isLogExpanded, setIsLogExpanded] = useState(false);

  // Ajuste reactivo del tamaño del canvas
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Título dinámico para el header
  const headerTitle = useMemo(() => {
    return `${campaign?.name || 'Campaña'}`;
  }, [campaign?.name]);

  const handleDiceClick = useCallback(() => {
    console.log("Abrir panel de dados");
  }, []);

  const toggleParticipants = useCallback(() => {
    setActivePanel(prev => prev === 'participants' ? 'none' : 'participants');
  }, []);

  // Ordenar participantes por iniciativa para la lista lateral
  const sortedParticipants = useMemo(() => {
    return [...combat.participants].sort((a, b) => (b.initiative || 0) - (a.initiative || 0));
  }, [combat.participants]);

  // Encontrar el participante en turno (ejemplo: el primero de la lista si hay combate activo)
  const turnIndex = 0; // FASE 2: Conectar con el estado real de turnos del combate
  const currentTurnId = sortedParticipants[turnIndex]?.id;

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0c] flex flex-col overflow-hidden text-foreground animate-in fade-in duration-300">
      <BattleMapHeader 
        title={headerTitle} 
        onBack={onBack} 
        onMenuToggle={toggleParticipants} 
      />

      <main className="flex-1 relative overflow-hidden">
        {/* Turn Tracker (Etiquetas laterales) */}
        <div className="absolute left-0 top-1/4 z-40 flex flex-col gap-1 pointer-events-none">
          {sortedParticipants.slice(0, 6).map((p, idx) => {
            const isTurn = p.id === currentTurnId;
            const color = p.enemy_color || p.color || "var(--gold)";
            
            return (
              <div 
                key={p.id}
                className={`
                  pointer-events-auto group flex items-center transition-all duration-300 transform
                  ${isTurn ? 'translate-x-0' : '-translate-x-[75%] hover:translate-x-0'}
                `}
              >
                <div 
                  className={`
                    px-3 py-1.5 rounded-r-full font-display text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2
                    ${isTurn ? 'bg-secondary/90 border-y border-r border-white/20' : 'bg-black/60 border-y border-r border-white/10 opacity-70 hover:opacity-100'}
                  `}
                  style={{ borderRightColor: color }}
                >
                  {isTurn && (
                    <div className="w-5 h-5 rounded-full bg-[var(--gold)] text-black flex items-center justify-center shadow-glow">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h.01"/><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M18 12h.01"/></svg>
                    </div>
                  )}
                  <span style={{ color }}>{p.display_name}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Overlay para cerrar paneles al tocar el mapa */}
        {activePanel !== 'none' && (
          <div 
            className="absolute inset-0 bg-black/40 z-30 transition-opacity animate-in fade-in"
            onClick={() => setActivePanel('none')}
          />
        )}

        {/* Panel Lateral: Participantes (Drawer) */}
        <div className={`absolute left-0 top-0 h-full z-50 transition-transform duration-300 transform ${activePanel === 'participants' ? 'translate-x-0' : '-translate-x-full'}`}>
          <BattleMapSidebar 
            participants={sortedParticipants} 
            isOpen={true}
            onOpenChar={onOpenChar}
            onClose={() => setActivePanel('none')}
          />
        </div>

        {/* Área del Canvas (Konva) */}
        <div className="w-full h-full">
          <BattleMapStage 
            width={dimensions.width} 
            height={dimensions.height - 56} 
            participants={combat.participants}
          />
        </div>

        {/* Dados Flotantes */}
        <BattleMapDiceButton onClick={handleDiceClick} />
        
        {/* Log de Batalla Fijo Abajo */}
        <div 
          className={`
            absolute bottom-0 left-0 right-0 z-40 transition-all duration-300 bg-[#0a0a0c]/90 border-t border-white/10 backdrop-blur-md cursor-pointer
            ${isLogExpanded ? 'h-64' : 'h-14'}
          `}
          onClick={() => setIsLogExpanded(!isLogExpanded)}
        >
          <div className="absolute top-0 right-4 -translate-y-1/2">
            <div className="p-1.5 rounded-full bg-black/60 border border-white/10 text-[var(--gold)]">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className={`transition-transform duration-300 ${isLogExpanded ? 'rotate-180' : ''}`}
              >
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            </div>
          </div>
          <div className="h-full overflow-hidden">
             <BattleMapLog 
                logs={logs} 
                nameOverrides={nameOverrides} 
                onOpenChar={onOpenChar}
                isExpanded={isLogExpanded}
              />
          </div>
        </div>
      </main>
    </div>
  );
};

export default BattleMap;

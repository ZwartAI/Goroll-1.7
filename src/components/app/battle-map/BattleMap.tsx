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
  const [activePanel, setActivePanel] = useState<'none' | 'participants' | 'log'>('none');
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

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
    return `${campaign?.name || 'Campaña'} - ${t('battleMap.title')}`;
  }, [campaign?.name, t]);

  const handleDiceClick = useCallback(() => {
    console.log("Abrir panel de dados");
  }, []);

  const togglePanel = useCallback((panel: 'participants' | 'log') => {
    setActivePanel(prev => prev === panel ? 'none' : panel);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0c] flex flex-col overflow-hidden text-foreground animate-in fade-in duration-300">
      <BattleMapHeader 
        title={headerTitle} 
        onBack={onBack} 
        onMenuToggle={() => togglePanel('participants')} 
      />

      <main className="flex-1 relative overflow-hidden">
        {/* Panel Lateral: Participantes */}
        <div className={`absolute left-0 top-0 h-full z-40 transition-transform duration-300 transform ${activePanel === 'participants' ? 'translate-x-0' : '-translate-x-full'}`}>
          <BattleMapSidebar 
            participants={combat.participants} 
            isOpen={true} // Siempre true porque controlamos la visibilidad con el contenedor
            onOpenChar={onOpenChar}
            onClose={() => setActivePanel('none')}
          />
        </div>

        {/* Área del Canvas (Konva) - Siempre a pantalla completa tras el header */}
        <div className="w-full h-full">
          <BattleMapStage 
            width={dimensions.width} 
            height={dimensions.height - 56} 
            participants={combat.participants}
          />
        </div>

        {/* Botones Flotantes de Acceso Rápido (UX Mobile) */}
        <div className="absolute right-4 bottom-24 flex flex-col gap-3 z-30">
           <button 
            onClick={() => togglePanel('log')}
            className={`p-3 rounded-full border border-white/10 backdrop-blur-md transition-all ${activePanel === 'log' ? 'bg-[var(--gold)] text-black' : 'bg-black/40 text-[var(--gold)]'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </button>
        </div>

        <BattleMapDiceButton onClick={handleDiceClick} />
        
        {/* Panel de Log (Slide-in desde la derecha o abajo) */}
        <div className={`absolute right-0 top-0 h-full w-full sm:w-80 z-40 transition-transform duration-300 transform ${activePanel === 'log' ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="h-full bg-[#0a0a0c]/95 border-l border-border/50 backdrop-blur-md shadow-2xl flex flex-col pt-14">
            <div className="p-4 border-b border-border/30 flex items-center justify-between">
              <h2 className="font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Log de Batalla</h2>
              <button onClick={() => setActivePanel('none')} className="text-muted-foreground hover:text-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <BattleMapLog 
                logs={logs} 
                nameOverrides={nameOverrides} 
                onOpenChar={onOpenChar}
              />
            </div>
          </div>
        </div>
      </main>
    </div>

  );
};

export default BattleMap;

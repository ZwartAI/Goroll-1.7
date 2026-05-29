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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0c] flex flex-col overflow-hidden text-foreground animate-in fade-in duration-300">
      <BattleMapHeader 
        title={headerTitle} 
        onBack={onBack} 
        onMenuToggle={toggleSidebar} 
      />

      <main className="flex-1 relative overflow-hidden">
        <BattleMapSidebar 
          participants={combat.participants} 
          isOpen={isSidebarOpen} 
          onOpenChar={onOpenChar}
        />

        {/* Área del Canvas (Konva) */}
        <div className={`w-full h-full transition-all duration-300 ${isSidebarOpen ? 'pl-0 sm:pl-64' : 'pl-0'}`}>
          <BattleMapStage 
            width={isSidebarOpen && window.innerWidth > 640 ? dimensions.width - 256 : dimensions.width} 
            height={dimensions.height - 56} 
            participants={combat.participants}
          />
        </div>

        <BattleMapDiceButton onClick={handleDiceClick} />
        
        <BattleMapLog 
          logs={logs} 
          nameOverrides={nameOverrides} 
          onOpenChar={onOpenChar}
        />
      </main>

      {/* PREPARADO PARA FASE 2: Capas de Interfaz (Overlays) */}
    </div>
  );
};

export default BattleMap;

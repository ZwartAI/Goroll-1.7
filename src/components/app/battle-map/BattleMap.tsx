import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Pencil, Layers, LogOut } from 'lucide-react';
import { useGameData } from '@/lib/useGame';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useT } from '@/lib/i18n';
import type { LogRow } from '@/lib/game';
import { BattleMapHeader } from './BattleMapHeader';
import { BattleMapSidebar } from './BattleMapSidebar';
import { BattleMapStage } from './BattleMapStage';
import { BattleMapDiceButton } from './BattleMapDiceButton';
import { BattleMapLog } from './BattleMapLog';
import { BattleMapConfigModal } from './BattleMapConfigModal';
import { BattleMapProjectionMenu } from './BattleMapProjectionMenu';
import { BattleMapChalkControls, type ChalkTool, type ChalkColor, type ChalkSize } from './BattleMapChalkControls';
import { BattleMapChalkLayer, type ChalkLine, type ChalkNote } from './BattleMapChalkLayer';
import { BattleMapScenesPanel, type BattleMapScene } from './BattleMapScenesPanel';
import type { ProjectionType, ProjectionState } from './BattleMapStage';

// FASE 2: MapConfig interface
export interface MapConfig {
  backgroundUrl: string;
  backgroundType: 'image' | 'video';
  backgroundScale: number;
  backgroundOpacity: number;
  backgroundBrightness: number;
  gridSize: number;
  gridColor: string;
  gridOpacity: number;
  showGrid: boolean;
}

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
  const [mapConfig, setMapConfig] = useState<MapConfig>({
    backgroundUrl: '',
    backgroundType: 'image',
    backgroundScale: 1,
    backgroundOpacity: 1,
    backgroundBrightness: 1,
    gridSize: 50,
    gridColor: 'rgba(255,255,255,0.1)',
    gridOpacity: 0.5,
    showGrid: true
  });
  const [projectionMenu, setProjectionMenu] = useState<{ x: number, y: number, tokenId: string } | null>(null);
  
  // FASE 4: Chalk state
  const [isChalkMode, setIsChalkMode] = useState(false);
  const [chalkTool, setChalkTool] = useState<ChalkTool>('pencil');
  const [chalkColor, setChalkColor] = useState<ChalkColor>('#ffffff');
  const [chalkSize, setChalkSize] = useState<ChalkSize>(5);
  const [chalkLines, setChalkLines] = useState<ChalkLine[]>([]);
  const [chalkNotes, setChalkNotes] = useState<ChalkNote[]>([]);

  const stageRef = useRef<any>(null); // For future direct interaction if needed

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

  // FASE 4: Chalk Handlers
  const handleAddChalkLine = useCallback((line: ChalkLine) => {
    setChalkLines(prev => [...prev, line]);
  }, []);

  const handleUndoChalk = useCallback(() => {
    setChalkLines(prev => prev.slice(0, -1));
  }, []);

  const handleClearChalk = useCallback(() => {
    if (confirm("¿Borrar todos los dibujos y notas?")) {
      setChalkLines([]);
      setChalkNotes([]);
    }
  }, []);

  const handleAddNote = useCallback((x: number, y: number) => {
    const text = prompt("Texto de la nota:");
    if (text) {
      const newNote: ChalkNote = {
        id: Math.random().toString(36).substr(2, 9),
        x,
        y,
        text
      };
      setChalkNotes(prev => [...prev, newNote]);
    }
  }, []);

  const handleNoteUpdate = useCallback((id: string, x: number, y: number) => {
    setChalkNotes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
  }, []);

  const handleNoteDelete = useCallback((id: string) => {
    setChalkNotes(prev => prev.filter(n => n.id !== id));
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
          {sortedParticipants.slice(0, 12).map((p, idx) => {
            const isTurn = p.id === currentTurnId;
            const color = p.enemy_color || p.color || "var(--gold)";
            
            return (
              <div 
                key={p.id}
                className={`
                  pointer-events-auto group flex items-center transition-all duration-300 transform
                  ${isTurn ? 'translate-x-0' : '-translate-x-[85%] hover:translate-x-0'}
                `}
              >
                <div 
                  className={`
                    px-2.5 py-1.5 rounded-r-full font-display text-[9px] uppercase tracking-widest shadow-lg flex items-center gap-2
                    ${isTurn ? 'bg-secondary/90 border-y border-r border-white/20' : 'bg-black/60 border-y border-r border-white/10 opacity-60 hover:opacity-100'}
                  `}
                  style={{ borderRightColor: color }}
                >
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center border border-white/20 ${isTurn ? 'bg-[var(--gold)] text-black' : 'bg-black/40 text-muted-foreground'}`}>
                    {idx + 1}
                  </div>
                  <span className="truncate max-w-[60px]" style={{ color }}>{p.display_name}</span>
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
            config={mapConfig}
            onLongPressToken={(tokenId, x, y) => setProjectionMenu({ tokenId, x, y })}
            // FASE 4 Props
            isChalkMode={isChalkMode}
            chalkTool={chalkTool}
            chalkColor={chalkColor}
            chalkSize={chalkSize}
            chalkLines={chalkLines}
            chalkNotes={chalkNotes}
            onAddChalkLine={handleAddChalkLine}
            onAddNote={handleAddNote}
            onNoteUpdate={handleNoteUpdate}
            onNoteClick={handleNoteDelete}
          />
        </div>

        {/* FASE 3: Menú de Proyecciones */}
        {projectionMenu && (
          <BattleMapProjectionMenu 
            x={projectionMenu.x} 
            y={projectionMenu.y}
            onSelect={(type) => {
              // Encontrar el token y su posición actual para el origen
              const part = combat.participants.find(p => p.id === projectionMenu.tokenId);
              if (part) {
                // FASE 3: Esta lógica se activará en el stage
                // Para simplificar, le pasamos la orden al stage de iniciar proyección
                // Podríamos usar un ref o un estado compartido.
                // Usemos un pequeño hack temporal: disparar un evento custom que el stage escuche
                const event = new CustomEvent('start-projection', { 
                  detail: { type, tokenId: projectionMenu.tokenId } 
                });
                window.dispatchEvent(event);
              }
              setProjectionMenu(null);
            }}
            onClose={() => setProjectionMenu(null)}
          />
        )}

        {/* Panel de Configuración (DM only) */}
        {useGameData().character?.role === 'dm' && (
          <>
            <BattleMapConfigModal config={mapConfig} onChange={setMapConfig} />
            
            {/* FASE 4: Botón de Tiza y Controles */}
            {!isChalkMode ? (
              <button
                onClick={() => setIsChalkMode(true)}
                className="absolute bottom-20 right-4 z-40 bg-[#1a1a1e]/90 hover:bg-[var(--gold)] hover:text-black border border-white/10 p-4 rounded-full shadow-2xl transition-all group"
              >
                <Pencil className="w-6 h-6 text-[var(--gold)] group-hover:text-black" />
              </button>
            ) : (
              <BattleMapChalkControls
                activeTool={chalkTool}
                onToolChange={setChalkTool}
                currentColor={chalkColor}
                onColorChange={setChalkColor}
                currentSize={chalkSize}
                onSizeChange={setChalkSize}
                onUndo={handleUndoChalk}
                onClear={handleClearChalk}
                onExit={() => setIsChalkMode(false)}
              />
            )}
          </>
        )}

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

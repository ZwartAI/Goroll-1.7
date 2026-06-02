import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useBattleMap, MapToken } from '@/hooks/useBattleMap';
import { useGameData } from '@/lib/useGame';
import { Header } from './Header';
import { Stage, StageHandle } from './Stage';
import { Toolbar, MapTool } from './Toolbar';
import { Sidebar } from './Sidebar';
import { Log } from './Log';
import { SceneManager } from './SceneManager';
import { MapSettings } from './MapSettings';
import { DiceButton } from './DiceButton';
import { DicePanel, DieSelection } from './DicePanel';
import { useT } from '@/lib/i18n';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { pushLog } from '@/lib/log';
import { supabase } from '@/integrations/supabase/client';
import { SharedDiceAnimationOverlay } from '../SharedDiceAnimationOverlay';


interface Props {
  onBack: () => void;
  logs: any[];
  nameOverrides?: Record<string, { name: string; color: string }>;
  onOpenChar: (id: string) => void;
}

export default function BattleMapMain({ onBack, logs, nameOverrides, onOpenChar }: Props) {
  const { campaign, character } = useGameData();
  const campaignId = campaign?.id || '';
  const isDM = character?.role === 'dm';
  const { t } = useT();
  
  const battleMap = useBattleMap(campaignId);
  const [showScenes, setShowScenes] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTool, setActiveTool] = useState<MapTool>('move');
  const [logExpanded, setLogExpanded] = useState(false);
  const [showDicePanel, setShowDicePanel] = useState(false);
  const stageRef = useRef<StageHandle>(null);
  const [tokenToPlace, setTokenToPlace] = useState<Partial<MapToken> | null>(null);

  const handleResetView = () => {
    if (stageRef.current) {
      stageRef.current.centerView();
    }
  };

  const handleClearDrawings = async () => {
    if (confirm('¿Borrar todos los dibujos?')) {
      await battleMap.clearDrawings();
    }
  };

  useEffect(() => {
    if (isDM && !battleMap.isLoading && battleMap.scenes.length === 0) {
      battleMap.createScene('Mapa Principal');
    }
  }, [isDM, battleMap.isLoading, battleMap.scenes.length]);

  const handleRollDice = useCallback((selections: DieSelection[]) => {
    setShowDicePanel(false);
    
    let total = 0;
    const individualResults: string[] = [];

    selections.forEach(sel => {
      const sides = parseInt(sel.type.substring(1));
      for (let i = 0; i < sel.count; i++) {
        const res = Math.floor(Math.random() * sides) + 1;
        total += res;
        individualResults.push(`${sel.type}: ${res}`);
      }
    });

    if (campaignId && character) {
      pushLog(campaignId, [
        { t: 'char', v: character.name, color: character.color || 'var(--gold)', id: character.id },
        { t: 'text', v: ' ha lanzado los dados: ' },
        { t: 'text', v: individualResults.join(', ') },
        { t: 'text', v: ' | Total: ' },
        { t: 'text', v: total.toString() }
      ]);
      toast.success(`Tirada: ${total}`);
    }
  }, [campaignId, character]);

  if (battleMap.isLoading) {
    return (
      <div className="fixed inset-0 z-[110] bg-black/95 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-[var(--gold)]/20 border-t-[var(--gold)] rounded-full animate-spin mb-6" />
        <p className="font-display text-[var(--gold)] text-sm uppercase tracking-widest animate-pulse">
          Cargando Mapa Táctico...
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[110] bg-[#0a0a0a] flex flex-col overflow-hidden text-white font-sans">
      {/* Header */}
      <Header 
        onBack={onBack} 
        isDM={isDM} 
        campaignName={campaign?.name || ''} 
      />

      <div className="flex-1 relative overflow-hidden flex">
        {/* Main Stage Area */}
        <Stage 
          ref={stageRef}
          battleMap={battleMap} 
          isDM={isDM} 
          activeTool={activeTool}
          characterId={character?.id}
        />

        {/* Sidebar (Turns/Participants) */}
        <Sidebar 
          onOpenChar={onOpenChar}
          battleMap={battleMap}
          isDM={isDM}
          onInitiatePlacement={(token) => setTokenToPlace(token)}
        />

        {/* Toolbar (Right) */}
        <Toolbar 
          activeTool={activeTool} 
          setActiveTool={setActiveTool} 
          isDM={isDM}
          onOpenScenes={() => setShowScenes(true)}
          onOpenSettings={() => setShowSettings(true)}
          onResetView={handleResetView}
          onClearDrawings={handleClearDrawings}
          onOpenDice={() => setShowDicePanel(!showDicePanel)}
          onInvokeToken={(template) => {
            if (character && battleMap.activeScene) {
              const currentSceneId = battleMap.activeScene.id;
              const myToken = battleMap.tokens.find((t: any) => t.character_id === character.id && t.scene_id === currentSceneId);
              if (myToken) {
                battleMap.removeToken(myToken.id);
              } else if (template) {
                setTokenToPlace({
                  ...template,
                  character_id: character.id,
                  name: character.name,
                  image_url: character.image_url,
                  image_scale: (character as any).image_scale || 1,
                  image_offset_x: (character as any).image_offset_x ?? 50,
                  image_offset_y: (character as any).image_offset_y ?? 50,
                });
              }
            }
          }}
          hasMyToken={character && battleMap.activeScene ? battleMap.tokens.some((t: any) => t.character_id === character.id && t.scene_id === battleMap.activeScene?.id) : false}
          hasBackground={!!battleMap.activeScene?.background_url}
        />


        <AnimatePresence>
          {showDicePanel && (
            <DicePanel 
              onClose={() => setShowDicePanel(false)} 
              onRoll={handleRollDice} 
            />
          )}
        </AnimatePresence>

        {/* Token Placement Card */}
        <AnimatePresence>
          {tokenToPlace && (
            <div className="fixed inset-0 z-[150] pointer-events-none flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 50 }}
                className="pointer-events-auto bg-black/80 backdrop-blur-xl border border-[var(--gold)]/30 rounded-2xl p-4 flex flex-col items-center gap-4 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-t-[var(--gold)]/50"
              >
                <div className="text-center">
                  <h3 className="font-display text-[var(--gold)] text-xs uppercase tracking-widest mb-1">
                    Colocar en el Mapa
                  </h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-tighter">
                    Arrastra esta ficha para posicionarla
                  </p>
                </div>

                <motion.div
                  drag
                  dragSnapToOrigin
                  onDragEnd={(e, info) => {
                    if (stageRef.current) {
                      const stageElement = document.querySelector('.stage-bg');
                      if (stageElement) {
                        const stageRect = stageElement.parentElement!.getBoundingClientRect();
                        const isInside = (
                          info.point.x >= stageRect.left &&
                          info.point.x <= stageRect.right &&
                          info.point.y >= stageRect.top &&
                          info.point.y <= stageRect.bottom
                        );

                        if (isInside) {
                          const worldCoords = stageRef.current.screenToWorld(info.point.x, info.point.y);
                          
                          // Adjust for token center (roughly)
                          const gridSize = battleMap.activeScene?.grid_size || 70;
                          let finalX = worldCoords.x - (gridSize / 2);
                          let finalY = worldCoords.y - (gridSize / 2);

                          // Snap to grid if enabled
                          if (battleMap.activeScene?.snap_to_grid) {
                            const offsetX = battleMap.activeScene.grid_offset_x || 0;
                            const offsetY = battleMap.activeScene.grid_offset_y || 0;
                            finalX = Math.round((finalX - offsetX) / gridSize) * gridSize + offsetX;
                            finalY = Math.round((finalY - offsetY) / gridSize) * gridSize + offsetY;
                          }

                          battleMap.addToken({
                            ...tokenToPlace,
                            x: finalX,
                            y: finalY
                          });
                          setTokenToPlace(null);
                        }
                      }
                    }
                  }}
                  className="cursor-grab active:cursor-grabbing relative group"
                >
                  <div className="w-16 h-16 rounded-full border-2 border-[var(--gold)] overflow-hidden shadow-2xl relative">
                    {tokenToPlace.image_url ? (
                      <img src={tokenToPlace.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary text-2xl">🧙</div>
                    )}
                    <div className="absolute inset-0 bg-[var(--gold)]/20 animate-pulse group-hover:bg-transparent transition-colors" />
                  </div>
                  
                  {/* Decorative element to suggest dragging */}
                  <motion.div 
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute -top-6 left-1/2 -translate-x-1/2 text-[var(--gold)]"
                  >
                    <div className="flex flex-col items-center">
                      <ChevronRight className="w-4 h-4 rotate-[-90deg]" />
                    </div>
                  </motion.div>
                </motion.div>

                <button
                  onClick={() => setTokenToPlace(null)}
                  className="text-[10px] text-white/40 hover:text-white transition-colors uppercase tracking-widest mt-2"
                >
                  Cancelar
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Log (Bottom) */}
      <Log 
        logs={logs} 
        expanded={logExpanded} 
        onToggle={() => setLogExpanded(!logExpanded)} 
        nameOverrides={nameOverrides}
        onOpenChar={onOpenChar}
      />

      {/* Modals */}
      <AnimatePresence>
        {showScenes && isDM && (
          <SceneManager 
            battleMap={battleMap} 
            onClose={() => setShowScenes(false)} 
          />
        )}
        {showSettings && isDM && (
          <MapSettings 
            battleMap={battleMap} 
            onClose={() => setShowSettings(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useBattleMap, MapToken } from '@/hooks/useBattleMap';
import { useGameData } from '@/lib/useGame';
import { Header } from './Header';
import { Stage, StageHandle } from './Stage';
import { toast } from 'sonner';
import { Toolbar, MapTool, MeasureMode } from './Toolbar';
import { Sidebar } from './Sidebar';
import { Log } from './Log';
import { SceneManager } from './SceneManager';
import { MapSettings } from './MapSettings';
import { DiceButton } from './DiceButton';
import { DicePanel, DieSelection } from './DicePanel';
import { useT } from '@/lib/i18n';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Gift, BookOpen, Users, HeartPulse, X, ScrollText, Sparkles, Box } from 'lucide-react';
import { pushLog } from '@/lib/log';
import { supabase } from '@/integrations/supabase/client';
import { SharedDiceAnimationOverlay } from '../SharedDiceAnimationOverlay';
import { BattleMapAdminSidebar } from '../battle-map/BattleMapAdminSidebar';
import { CreationGridModal } from '../CreationGridModal';
import { RewardSackManager } from '../reward-sacks/RewardSackManager';
import { MonsterEditor } from '../MonsterEditor';
import { NpcEditorModal } from '../NpcEditorModal';
import { ConditionsPanel } from '../ConditionsPanel';
import { SkillsManager } from '../SkillsManager';
import { ItemEditor } from '../ItemEditor';
import { backdropProps } from '@/lib/modalBackdrop';


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
  const [measureMode, setMeasureMode] = useState<MeasureMode>('line');
  const [measureSnap, setMeasureSnap] = useState(true);
  const [brushSize, setBrushSize] = useState(140);
  const stageRef = useRef<StageHandle>(null);
  const [tokenToPlace, setTokenToPlace] = useState<Partial<MapToken> | null>(null);
  const [showAdminSidebar, setShowAdminSidebar] = useState(false);
  const [showCreationGrid, setShowCreationGrid] = useState(false);
  const [showRewardSacks, setShowRewardSacks] = useState(false);
  const [isCreatingMonster, setIsCreatingMonster] = useState(false);
  const [isCreatingNpc, setIsCreatingNpc] = useState(false);
  const [isManagingConditions, setIsManagingConditions] = useState(false);
  const [isManagingSkills, setIsManagingSkills] = useState(false);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [mapDimensions, setMapDimensions] = useState({ width: 8000, height: 8000, imgWidth: 4000, imgHeight: 4000 });


  // Estados de visibilidad de UI (Bar Map) - Persistidos localmente
  const [showSidebar, setShowSidebar] = useState(() => {
    const saved = localStorage.getItem('battlemap_show_sidebar');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showToolbar, setShowToolbar] = useState(() => {
    const saved = localStorage.getItem('battlemap_show_toolbar');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Persistir cambios de visibilidad
  useEffect(() => {
    localStorage.setItem('battlemap_show_sidebar', JSON.stringify(showSidebar));
  }, [showSidebar]);

  useEffect(() => {
    localStorage.setItem('battlemap_show_toolbar', JSON.stringify(showToolbar));
  }, [showToolbar]);

  const handleResetView = () => {
    if (stageRef.current) {
      stageRef.current.centerView();
    }
  };

  const handleClearDrawings = async (options?: { authorId?: string, all?: boolean }) => {
    await battleMap.clearDrawings(options);
  };

  const handleUndoDrawing = useCallback(async () => {
    if (character?.id) {
      await battleMap.undoLastDrawing(character.id);
    }
  }, [battleMap, character?.id]);

  const handleClearFog = useCallback(async () => {
    await battleMap.clearFog();
  }, [battleMap]);

  const handleUndoFog = useCallback(async () => {
    await battleMap.undoLastFog();
  }, [battleMap]);

  useEffect(() => {

    if (isDM && !battleMap.isLoading && battleMap.scenes.length === 0) {
      battleMap.createScene('Mapa Principal');
    }
  }, [isDM, battleMap.isLoading, battleMap.scenes.length]);

  const handleRollDice = useCallback(async (selections: DieSelection[]) => {
    setShowDicePanel(false);
    
    let total = 0;
    const individualResults: string[] = [];
    const diceData: any[] = [];

    selections.forEach(sel => {
      const sides = parseInt(sel.type.substring(1));
      for (let i = 0; i < sel.count; i++) {
        const res = Math.floor(Math.random() * sides) + 1;
        total += res;
        individualResults.push(`${sel.type}: ${res}`);
        diceData.push({
          id: Math.random().toString(36).substring(2, 9),
          type: sel.type,
          sides,
          result: res,
          x: (Math.random() - 0.5) * 400,
          y: (Math.random() - 0.5) * 400
        });
      }
    });

    if (campaignId && character) {
      // 1. Log to history
      pushLog(campaignId, [
        { t: 'char', v: character.name, color: character.color || 'var(--gold)', id: character.id },
        { t: 'text', v: ' ha lanzado los dados: ' },
        { t: 'text', v: individualResults.join(', ') },
        { t: 'text', v: ' | Total: ' },
        { t: 'text', v: total.toString() }
      ]);

      // 2. Trigger global animation via DB
      await supabase.from('dice_rolls').insert({
        campaign_id: campaignId,
        character_id: character.id,
        dice_data: diceData,
        total: total
      });
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
      <SharedDiceAnimationOverlay />

      {/* Header */}
      <Header 
        onBack={onBack} 
        isDM={isDM} 
        campaignName={campaign?.name || ''} 
        onMenuToggle={() => setShowAdminSidebar(true)}
      />

      <div className="flex-1 relative overflow-hidden flex">
        {/* Main Stage Area */}
        <Stage 
          ref={stageRef}
          battleMap={battleMap} 
          isDM={isDM} 
          activeTool={activeTool}
          measureMode={measureMode}
          measureSnap={measureSnap}
          characterId={character?.id}
          authorName={character?.name}
          authorColor={character?.color || '#FFD700'}
          showParticipants={showSidebar}
          onMapLoad={(dims: any) => setMapDimensions(dims)}
        />

        {/* Sidebar (Turns/Participants) */}
        <Sidebar 
          onOpenChar={onOpenChar}
          battleMap={battleMap}
          isDM={isDM}
          onInitiatePlacement={(token) => setTokenToPlace(token)}
          showParticipants={showSidebar}
        />

        {/* Toolbar (Right) */}
        <Toolbar 
          activeTool={activeTool} 
          setActiveTool={setActiveTool} 
          measureMode={measureMode}
          setMeasureMode={setMeasureMode}
          measureSnap={measureSnap}
          setMeasureSnap={setMeasureSnap}
          isDM={isDM} 
          onOpenScenes={() => setShowScenes(true)}
          onOpenSettings={() => setShowSettings(true)}
          onResetView={handleResetView}
          onClearDrawings={handleClearDrawings}
          onUndoDrawing={handleUndoDrawing}
          onClearFog={handleClearFog}
          onUndoFog={handleUndoFog}
          fogElements={battleMap.fog}
          showToolbar={showToolbar}
          
          characterId={character?.id}
          authorName={character?.name}
          authorColor={character?.color || '#FFD700'}
          drawings={battleMap.drawings}
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
                  color: character.color,
                });
              }
            }
          }}
          hasMyToken={character && battleMap.activeScene ? battleMap.tokens.some((t: any) => t.character_id === character.id && t.scene_id === battleMap.activeScene?.id) : false}
          hasBackground={!!battleMap.activeScene?.background_url}
          brushSize={brushSize}
          setBrushSize={setBrushSize}
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

      <BattleMapAdminSidebar 
        isOpen={showAdminSidebar}
        onClose={() => setShowAdminSidebar(false)}
        isDM={isDM}
        showList={showSidebar}
        onToggleList={() => setShowSidebar(!showSidebar)}
        showToolbar={showToolbar}
        onToggleToolbar={() => setShowToolbar(!showToolbar)}
        onInvokeToken={() => {
          // Implementación para abrir selector de tokens si fuera necesario
          // Por ahora solo cerramos para indicar que recibió el click
          setShowAdminSidebar(false);
          toast.info("Función de invocar en desarrollo para v2");
        }}
        onOpenSettings={() => {
          setShowSettings(true);
          setShowAdminSidebar(false);
        }}
        onOpenCreationGrid={() => {
          setShowCreationGrid(true);
          setShowAdminSidebar(false);
        }}
      />

      <AnimatePresence>
        {showCreationGrid && (
          <CreationGridModal
            isOpen={showCreationGrid}
            onClose={() => setShowCreationGrid(false)}
            items={[
              {
                id: 'reward-sack',
                label: 'Bolsas de Recompensa',
                icon: <Gift />,
                color: 'var(--gold)',
                description: 'Gestiona los tesoros y recompensas para tus jugadores.',
                action: () => { setShowRewardSacks(true); setShowCreationGrid(false); }
              },
              {
                id: 'item',
                label: 'Crear Item',
                icon: <Box />,
                color: '#f59e0b',
                description: 'Crea nuevo equipamiento, consumibles u objetos clave.',
                action: () => { setIsCreatingItem(true); setShowCreationGrid(false); }
              },
              {
                id: 'skill',
                label: 'Habilidades (Skills)',
                icon: <Sparkles />,
                color: '#a855f7',
                description: 'Asigna y gestiona las habilidades de tus jugadores.',
                action: () => { setIsManagingSkills(true); setShowCreationGrid(false); }
              },
              {
                id: 'monster',
                label: 'Monstruos / Enemigos',
                icon: <BookOpen />,
                color: '#ef4444',
                description: 'Diseña nuevas criaturas para tu bestiario.',
                action: () => { setIsCreatingMonster(true); setShowCreationGrid(false); }
              },
              {
                id: 'npc',
                label: 'Personajes (NPC)',
                icon: <Users />,
                color: '#3b82f6',
                description: 'Crea personajes con estadísticas propias.',
                action: () => { setIsCreatingNpc(true); setShowCreationGrid(false); }
              },
              {
                id: 'condition',
                label: 'Efectos de Condición',
                icon: <HeartPulse />,
                color: '#ec4899',
                description: 'Gestiona estados y efectos.',
                action: () => { setIsManagingConditions(true); setShowCreationGrid(false); }
              }
            ]}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRewardSacks && campaignId && (
          <RewardSackManager 
            campaignId={campaignId} 
            onClose={() => setShowRewardSacks(false)} 
          />
        )}

        {isCreatingMonster && character && (
          <MonsterEditor
            campaignId={campaignId}
            dm={{ id: character.id, name: character.name, color: character.color || 'var(--gold)' }}
            onClose={() => setIsCreatingMonster(false)}
            onSaved={() => setIsCreatingMonster(false)}
          />
        )}

        {isCreatingNpc && character && (
          <NpcEditorModal
            campaignId={campaignId}
            dm={{ id: character.id, name: character.name, color: character.color || 'var(--gold)' }}
            onClose={() => setIsCreatingNpc(false)}
            onSaved={() => setIsCreatingNpc(false)}
          />
        )}

        {isManagingConditions && character && (
          <div className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center p-4" {...backdropProps(() => setIsManagingConditions(false))}>
            <div className="ornate-card max-w-md w-full p-2 bg-[#0d0d0d]" onClick={e => e.stopPropagation()}>
               <div className="flex justify-end p-2">
                 <button onClick={() => setIsManagingConditions(false)} className="text-muted-foreground hover:text-white transition-colors">
                   <X size={20} />
                 </button>
               </div>
               <ConditionsPanel 
                 character={character as any} 
                 campaignId={campaignId}
                 viewerIsDm={true}
               />
            </div>
          </div>
        )}

        {isManagingSkills && character && (
          <div className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center p-4 overflow-y-auto" {...backdropProps(() => setIsManagingSkills(false))}>
            <div className="ornate-card max-w-4xl w-full p-6 bg-[#0a0a0c]/95 border border-[var(--gold)]/30" onClick={e => e.stopPropagation()}>
               <div className="flex justify-end mb-4">
                 <button onClick={() => setIsManagingSkills(false)} className="text-muted-foreground hover:text-white transition-colors">
                   <X size={20} />
                 </button>
               </div>
               <div className="max-h-[75vh] overflow-y-auto custom-scrollbar">
                 <SkillsManager 
                   campaignId={campaignId}
                   dm={{ id: character.id, name: character.name, color: character.color || 'var(--gold)' }}
                   players={characters.filter((c: any) => c.role === 'player').map((c: any) => ({
                     ...c,
                     skill_points: (c as any).skill_points || 0
                   }))}
                   onlineIds={onlineIds}
                 />
               </div>
            </div>
          </div>
        )}

        {isCreatingItem && character && (
          <div className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center p-4" {...backdropProps(() => setIsCreatingItem(false))}>
            <ItemEditor 
              campaignId={campaignId}
              dm={{ id: character.id, name: character.name, color: character.color || 'var(--gold)' }}
              onClose={() => setIsCreatingItem(false)}
              item={{
                id: crypto.randomUUID(),
                name: 'Nuevo Item',
                category: 'objeto',
                slot: 'objeto',
                rarity: 'white',
                equipped: false,
                owner_character_id: null,
                campaign_id: campaignId,
                created_at: new Date().toISOString()
              } as any}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

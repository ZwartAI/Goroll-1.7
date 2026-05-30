import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Pencil, Layers, LogOut, Settings } from 'lucide-react';
import { useGameData } from '@/lib/useGame';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import type { LogRow } from '@/lib/game';
import { buildOrderedTurns } from '@/lib/combat';
import { BattleMapHeader } from './BattleMapHeader';
import { BattleMapSidebar } from './BattleMapSidebar';
import { BattleMapTurnRail } from './BattleMapTurnRail';
import { BattleMapStage, type ProjectionType, type ProjectionState } from './BattleMapStage';
import { BattleMapDiceButton } from './BattleMapDiceButton';

import { BattleMapLog } from './BattleMapLog';
import { BattleMapConfigModal } from './BattleMapConfigModal';
import { BattleMapProjectionMenu } from './BattleMapProjectionMenu';
import { BattleMapChalkControls, type ChalkTool, type ChalkColor, type ChalkSize } from './BattleMapChalkControls';
import { type ChalkLine, type ChalkNote } from './BattleMapChalkLayer';
import { BattleMapScenesPanel, type BattleMapScene } from './BattleMapScenesPanel';
import { BattleMapDicePanel, type DieSelection } from './BattleMapDicePanel';
import { BattleMapDiceAnimation } from './BattleMapDiceAnimation';
import { BattleMapToolbar } from './BattleMapToolbar';
import { BattleMapBottomBar } from './BattleMapBottomBar';
import { playMapSound } from './BattleMapSounds';
import type { CombatParticipant, TurnBlock, CombatTurnGroup } from '@/lib/combat';
import { EnemyCombatSheetModal } from '@/components/app/EnemyCombatSheetModal';
import { EntityPortraitModal } from '@/components/app/EntityPortraitModal';
import { CharacterSheetModal } from '@/components/app/CharacterSheetModal';
import { X, Crown } from 'lucide-react';
import { backdropProps } from '@/lib/modalBackdrop';



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

interface Props {
  onBack: () => void;
  logs: LogRow[];
  nameOverrides?: Record<string, { name: string; color: string }>;
  onOpenChar: (id: string) => void;
}

const BattleMap: React.FC<Props> = ({ onBack, logs, nameOverrides, onOpenChar }) => {
  const { combat, campaign, character, characters, onlineIds } = useGameData();
  const { t } = useT();
  const [activePanel, setActivePanel] = useState<'none' | 'participants'>('none');
  const [isScenesPanelOpen, setIsScenesPanelOpen] = useState(false);
  const [isDicePanelOpen, setIsDicePanelOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [activeDiceRolls, setActiveDiceRolls] = useState<any[] | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [selectedEntityForSheet, setSelectedEntityForSheet] = useState<CombatParticipant | null>(null);
  const [selectedGroupSummary, setSelectedGroupSummary] = useState<CombatTurnGroup | null>(null);



  
  // FASE 5: Scenes state
  const [scenes, setScenes] = useState<BattleMapScene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  
  // FASE 5: Realtime state for remote users
  const [remoteTokenPositions, setRemoteTokenPositions] = useState<Record<string, { x: number, y: number }>>({});
  const [remoteProjections, setRemoteProjections] = useState<Record<string, ProjectionState>>({});

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

  const stageRef = useRef<any>(null);

  const isDM = character?.role === 'dm';

  // Ajuste reactivo del tamaño del canvas
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // FASE 5: Cargar Escenas y Suscribirse a cambios
  useEffect(() => {
    if (!campaign?.id) return;

    const fetchScenes = async () => {
      const { data, error } = await supabase
        .from('battle_map_scenes')
        .select('*')
        .eq('campaign_id', campaign.id)
        .order('created_at', { ascending: true });
      
      if (error) return;
      
      const typedScenes = (data as any[]).map(s => ({
        ...s,
        tokens_state: s.tokens_state || {},
        chalk_lines: s.chalk_lines || [],
        chalk_notes: s.chalk_notes || []
      })) as BattleMapScene[];

      setScenes(typedScenes);
      
      const active = typedScenes.find(s => s.is_active);
      if (active) {
        setActiveSceneId(active.id);
        applyScene(active);
      }
    };

    fetchScenes();

    const channel = supabase
      .channel('battle-map-scenes-' + campaign.id)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'battle_map_scenes', filter: `campaign_id=eq.${campaign.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setScenes(prev => [...prev, payload.new as BattleMapScene]);
          } else if (payload.eventType === 'UPDATE') {
            setScenes(prev => prev.map(s => s.id === payload.new.id ? { ...s, ...payload.new } : s));
            if (payload.new.is_active) {
              setActiveSceneId(payload.new.id);
              applyScene(payload.new as BattleMapScene);
            }
          } else if (payload.eventType === 'DELETE') {
            setScenes(prev => prev.filter(s => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [campaign?.id]);

  // FASE 5: Sync en Tiempo Real (Movimiento y Proyecciones)
  useEffect(() => {
    if (!campaign?.id) return;

    const channel = supabase.channel('battle-map-realtime:' + campaign.id)
      .on('broadcast', { event: 'token-move' }, (payload) => {
        setRemoteTokenPositions(prev => ({
          ...prev,
          [payload.payload.tokenId]: { x: payload.payload.x, y: payload.payload.y }
        }));
      })
      .on('broadcast', { event: 'projection-update' }, (payload) => {
        setRemoteProjections(prev => ({
          ...prev,
          [payload.payload.userId]: payload.payload.projection
        }));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [campaign?.id]);

  const applyScene = (scene: BattleMapScene) => {
    setMapConfig({
      backgroundUrl: scene.background_url,
      backgroundType: scene.background_type,
      backgroundScale: scene.background_scale,
      backgroundOpacity: scene.background_opacity,
      backgroundBrightness: scene.background_brightness,
      gridSize: scene.grid_size,
      gridColor: scene.grid_color,
      gridOpacity: scene.grid_opacity,
      showGrid: scene.show_grid
    });
    setChalkLines(scene.chalk_lines || []);
    setChalkNotes(scene.chalk_notes || []);
    setRemoteTokenPositions(scene.tokens_state || {});
  };

  const handleBroadcastMove = useCallback((tokenId: string, x: number, y: number) => {
    if (!campaign?.id) return;
    supabase.channel('battle-map-realtime:' + campaign.id).send({
      type: 'broadcast',
      event: 'token-move',
      payload: { tokenId, x, y }
    });
  }, [campaign?.id]);

  const handleBroadcastProjection = useCallback(async (projection: ProjectionState | null) => {
    if (!campaign?.id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    supabase.channel('battle-map-realtime:' + campaign.id).send({
      type: 'broadcast',
      event: 'projection-update',
      payload: { userId: user.id, projection }
    });
  }, [campaign?.id]);

  // FASE 5: Scene Management Handlers
  const handleSaveScene = useCallback(async (name: string) => {
    if (!campaign?.id) return;
    playMapSound('click');
    
    const newScene: any = {
      campaign_id: campaign.id,
      name,
      background_url: mapConfig.backgroundUrl,
      background_type: mapConfig.backgroundType,
      background_scale: mapConfig.backgroundScale,
      background_opacity: mapConfig.backgroundOpacity,
      background_brightness: mapConfig.backgroundBrightness,
      grid_size: mapConfig.gridSize,
      grid_color: mapConfig.gridColor,
      grid_opacity: mapConfig.gridOpacity,
      show_grid: mapConfig.showGrid,
      tokens_state: remoteTokenPositions,
      chalk_lines: chalkLines,
      chalk_notes: chalkNotes,
      is_active: false
    };

    const { error } = await supabase.from('battle_map_scenes').insert(newScene);
    if (error) toast.error("Error al guardar la escena");
    else toast.success("Escena guardada: " + name);
  }, [campaign?.id, mapConfig, remoteTokenPositions, chalkLines, chalkNotes]);

  const handleActivateScene = useCallback(async (sceneId: string) => {
    if (!campaign?.id) return;
    playMapSound('click');
    await supabase.from('battle_map_scenes').update({ is_active: false }).eq('campaign_id', campaign.id);
    const { error } = await supabase.from('battle_map_scenes').update({ is_active: true }).eq('id', sceneId);
    if (error) toast.error("Error al activar la escena");
    else toast.success("Escena activada en tiempo real");
  }, [campaign?.id]);

  const handleDeleteScene = useCallback(async (sceneId: string) => {
    if (confirm("¿Seguro que quieres eliminar esta escena?")) {
      const { error } = await supabase.from('battle_map_scenes').delete().eq('id', sceneId);
      if (error) toast.error("Error al eliminar la escena");
    }
  }, []);

  const handleUpdateCurrentSceneState = useCallback(async () => {
    if (!activeSceneId || !isDM) return;
    await supabase.from('battle_map_scenes').update({
      tokens_state: remoteTokenPositions as any,
      chalk_lines: chalkLines as any,
      chalk_notes: chalkNotes as any
    }).eq('id', activeSceneId);
  }, [activeSceneId, remoteTokenPositions, chalkLines, chalkNotes, isDM]);

  const headerTitle = useMemo(() => campaign?.name || 'Campaña', [campaign?.name]);

  const handleDiceClick = useCallback(() => setIsDicePanelOpen(true), []);

  const handleRollDice = useCallback((selections: DieSelection[]) => {
    setIsDicePanelOpen(false);
    playMapSound('dice');
    const newRolls: any[] = [];
    let total = 0;
    const individualResults: string[] = [];

    selections.forEach(sel => {
      const sides = parseInt(sel.type.substring(1));
      for (let i = 0; i < sel.count; i++) {
        const res = Math.floor(Math.random() * sides) + 1;
        total += res;
        individualResults.push(`${sel.type}: ${res}`);
        newRolls.push({
          id: Math.random().toString(36).substring(2, 9),
          type: sel.type,
          sides,
          result: res,
          // Random scatter positions
          x: (Math.random() - 0.5) * (dimensions.width * 0.4),
          y: (Math.random() - 0.5) * (dimensions.height * 0.4)
        });
      }
    });

    setActiveDiceRolls(newRolls);
    console.log(`Tirada: ${individualResults.join(', ')} | Total: ${total}`);
  }, [dimensions]);

  const toggleParticipants = useCallback(() => setActivePanel(prev => prev === 'participants' ? 'none' : 'participants'), []);

  // FASE 4: Chalk Handlers
  const handleAddChalkLine = useCallback((line: ChalkLine) => {
    setChalkLines(prev => [...prev, line]);
    playMapSound('chalk');
  }, []);
  const handleUndoChalk = useCallback(() => setChalkLines(prev => prev.slice(0, -1)), []);
  const handleClearChalk = useCallback(() => {
    if (confirm("¿Borrar todos los dibujos y notas?")) {
      setChalkLines([]);
      setChalkNotes([]);
    }
  }, []);

  const handleAddNote = useCallback((x: number, y: number) => {
    const text = prompt("Texto de la nota:");
    if (text) {
      playMapSound('chalk');
      setChalkNotes(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), x, y, text }]);
    }
  }, []);

  const handleNoteUpdate = useCallback((id: string, x: number, y: number) => {
    setChalkNotes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
  }, []);

  const handleNoteDelete = useCallback((id: string) => setChalkNotes(prev => prev.filter(n => n.id !== id)), []);

  const displayParticipants = useMemo(() => {
    const list = [...combat.participants];
    const summonedIdsInScene = Object.keys(remoteTokenPositions);
    
    characters.forEach(char => {
      if (list.some(p => p.character_id === char.id)) return;
      if (summonedIdsInScene.includes(char.id)) {
        list.push({
          id: char.id,
          encounter_id: combat.encounter?.id || 'none',
          campaign_id: campaign?.id || '',
          character_id: char.id,
          participant_type: 'player',
          display_name: char.name,
          image_url: char.image_url,
          color: char.color,
          initiative: 0,
          order_index: 999,
          image_offset_x: (char as any).image_offset_x,
          image_offset_y: (char as any).image_offset_y,
          image_scale: char.image_scale,
        } as any);
      }
    });

    return list;
  }, [combat.participants, remoteTokenPositions, characters, campaign?.id, combat.encounter?.id]);

  const orderedTurns = useMemo(() => {
    if (!combat.encounter || combat.encounter.status !== 'active') return [];
    return buildOrderedTurns(combat.participants, combat.groups, combat.pins);
  }, [combat.participants, combat.groups, combat.pins, combat.encounter?.status]);

  const activeBlockIndex = useMemo(() => {
    if (!combat.encounter || combat.encounter.status !== 'active' || orderedTurns.length === 0) return -1;
    return ((combat.encounter.current_turn_index % orderedTurns.length) + orderedTurns.length) % orderedTurns.length;
  }, [combat.encounter, orderedTurns]);

  const activeParticipantId = useMemo(() => {
    if (activeBlockIndex === -1 || !orderedTurns[activeBlockIndex]) return undefined;
    const block = orderedTurns[activeBlockIndex];
    if (block.kind === 'solo') return block.participant.id;
    if (block.kind === 'group') return block.members[0]?.id;
    if (block.kind === 'pin') return block.linked.id;
    return undefined;
  }, [activeBlockIndex, orderedTurns]);


  const handleToggleMyToken = useCallback(() => {
    if (!character?.id) return;
    const isSummoned = !!remoteTokenPositions[character.id];
    
    if (isSummoned) {
      const newState = { ...remoteTokenPositions };
      delete newState[character.id];
      setRemoteTokenPositions(newState);
      handleBroadcastMove(character.id, -9999, -9999);
      toast.success(t("battleMap.tokenRemoved") || "Token retirado");
    } else {
      const pos = { x: dimensions.width / 2, y: dimensions.height / 2 };
      setRemoteTokenPositions(prev => ({ ...prev, [character.id]: pos }));
      handleBroadcastMove(character.id, pos.x, pos.y);
      toast.success(t("battleMap.tokenSummoned") || "Token invocado");
    }
    handleUpdateCurrentSceneState();
  }, [character?.id, remoteTokenPositions, dimensions, handleBroadcastMove, handleUpdateCurrentSceneState, t]);

  const handleTurnRailClick = useCallback((block: TurnBlock) => {
    if (block.kind === 'solo') {
      const p = block.participant;
      if (p.participant_type === 'player' && p.character_id) {
        onOpenChar(p.character_id);
      } else {
        setSelectedEntityForSheet(p);
      }
    } else if (block.kind === 'pin') {
      setSelectedEntityForSheet(block.linked);
    } else if (block.kind === 'group') {
      setSelectedGroupSummary(block.group);
    }
  }, [onOpenChar]);


  const handleOpenNavSection = (section: string) => {
    toast.info(`Abriendo sección: ${section}`);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0c] flex flex-col overflow-hidden text-foreground animate-in fade-in duration-300">
      <BattleMapHeader 
        title={headerTitle} 
        onBack={async () => {
          if (isDM) await handleUpdateCurrentSceneState();
          onBack();
        }} 
        onMenuToggle={toggleParticipants} 
        onScenesToggle={isDM ? () => setIsScenesPanelOpen(true) : undefined}
        onlineCount={onlineIds.size}
        isDM={isDM}
      />

      <main className="flex-1 relative overflow-hidden bg-[#050507]">
        {/* FASE 7: Canvas Stage */}
        <div className="absolute inset-0 z-0">
          <BattleMapStage 
            width={dimensions.width} 
            height={dimensions.height - 112} // Adjusted for Header + BottomBar
            participants={displayParticipants}
            config={mapConfig}
            onLongPressToken={(tokenId, x, y) => setProjectionMenu({ tokenId, x, y })}
            isChalkMode={isChalkMode}
            chalkTool={chalkTool}
            chalkColor={chalkColor}
            chalkSize={chalkSize}
            chalkLines={chalkLines}
            chalkNotes={chalkNotes}
            onAddChalkLine={(line) => { handleAddChalkLine(line); handleUpdateCurrentSceneState(); }}
            onAddNote={(x, y) => { handleAddNote(x, y); handleUpdateCurrentSceneState(); }}
            onNoteUpdate={(id, x, y) => { handleNoteUpdate(id, x, y); handleUpdateCurrentSceneState(); }}
            onNoteClick={handleNoteDelete}
            remoteTokenPositions={remoteTokenPositions}
            remoteProjections={remoteProjections}
            onTokenMove={(id: string, x: number, y: number) => {
              setRemoteTokenPositions(prev => ({ ...prev, [id]: { x, y } }));
              handleBroadcastMove(id, x, y);
            }}
            onTokenMoveEnd={handleUpdateCurrentSceneState}
            onProjectionUpdate={handleBroadcastProjection}
            role={character?.role || 'spectator'}
            currentUserId={character?.id}
            isRulerActive={isRulerActive}
          />
        </div>

        {/* FASE 8: Improved Empty State */}
        {!mapConfig.backgroundUrl && isDM && !isScenesPanelOpen && !isDicePanelOpen && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] text-center max-w-sm pointer-events-auto animate-in zoom-in-95 duration-500 shadow-2xl">
              <div className="w-20 h-20 bg-[var(--gold)]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[var(--gold)]/20 shadow-[0_0_30px_rgba(234,179,8,0.1)]">
                <Layers className="w-10 h-10 text-[var(--gold)]" />
              </div>
              <h3 className="text-[var(--gold)] font-display text-base uppercase tracking-[0.3em] mb-3">Tu Escenario Espera</h3>
              <p className="text-muted-foreground text-[10px] uppercase tracking-widest mb-8 leading-relaxed opacity-60">
                Define el entorno táctico para tus jugadores.
              </p>
              <button 
                 onClick={() => setIsScenesPanelOpen(true)}
                 className="btn-fantasy text-[10px] px-8 py-3 w-full"
                 style={{ background: 'var(--gradient-gold)', color: 'black' }}
              >
                GESTIONAR ESCENAS
              </button>
            </div>
          </div>
        )}

        {/* FASE 7: Turn Rail (Left Side) */}
        {orderedTurns.length > 0 && (
          <BattleMapTurnRail 
            blocks={orderedTurns} 
            activeBlockIndex={activeBlockIndex} 
            onItemClick={handleTurnRailClick}
          />

        )}


        {/* Sidebar / Tools */}
        <div className="absolute top-10 right-4 z-40 flex flex-col gap-3 items-end">
            <BattleMapToolbar 
              isDM={isDM}
              isChalkMode={isChalkMode}
              chalkTool={chalkTool}
              onToggleChalk={() => setIsChalkMode(!isChalkMode)}
              onChalkToolChange={setChalkTool}
              hasToken={!!(character?.id && remoteTokenPositions[character.id])}
              onToggleToken={handleToggleMyToken}
              isRulerActive={isRulerActive}
              onToggleRuler={() => {
                setIsRulerActive(!isRulerActive);
                if (isChalkMode) setIsChalkMode(false);
              }}
            />

            {isDM && (
                <>
                    <button
                      onClick={() => setIsScenesPanelOpen(true)}
                      className={`w-11 h-11 rounded-full shadow-2xl transition-all group flex items-center justify-center border ${isScenesPanelOpen ? 'bg-[var(--gold)] text-black border-[var(--gold)]' : 'bg-black/80 backdrop-blur-md text-[var(--gold)] border-white/10 hover:bg-white/5'}`}
                      title="Escenas"
                    >
                      <Layers className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={() => setIsConfigModalOpen(true)}
                      className={`w-11 h-11 rounded-full shadow-2xl transition-all group flex items-center justify-center border ${isConfigModalOpen ? 'bg-[var(--gold)] text-black border-[var(--gold)]' : 'bg-black/80 backdrop-blur-md text-[var(--gold)] border-white/10 hover:bg-white/5'}`}
                      title="Ajustes"
                    >
                      <Settings className="w-5 h-5" />
                    </button>

                    <BattleMapConfigModal 
                      config={mapConfig} 
                      onChange={setMapConfig} 
                      isOpen={isConfigModalOpen} 
                      onClose={() => setIsConfigModalOpen(false)} 
                    />
                </>
            )}
        </div>

        {/* Overlay para cerrar paneles */}
        {(activePanel !== 'none' || isScenesPanelOpen || isDicePanelOpen) && (
          <div className="absolute inset-0 bg-black/40 z-30 transition-opacity animate-in fade-in backdrop-blur-[2px]" onClick={() => { 
            setActivePanel('none'); 
            setIsScenesPanelOpen(false); 
            setIsDicePanelOpen(false);
          }} />
        )}

        {/* Dice Panel */}
        {isDicePanelOpen && (
          <BattleMapDicePanel 
            onClose={() => setIsDicePanelOpen(false)}
            onRoll={handleRollDice}
          />
        )}

        {/* Dice Animation */}
        {activeDiceRolls && (
          <BattleMapDiceAnimation 
            dice={activeDiceRolls} 
            onComplete={() => setActiveDiceRolls(null)} 
          />
        )}

        {/* Chalk Controls */}
        {isChalkMode && isDM && (
          <div className="absolute top-20 right-20 z-50">
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
          </div>
        )}

        {/* Scenes Panel */}
        {isScenesPanelOpen && (
          <BattleMapScenesPanel 
            scenes={scenes}
            activeSceneId={activeSceneId || undefined}
            hasBackground={!!mapConfig.backgroundUrl}
            onSelectScene={(id) => {
              const s = scenes.find(sc => sc.id === id);
              if (s) { setActiveSceneId(s.id); applyScene(s); }
            }}
            onActivateScene={handleActivateScene}
            onSaveCurrentAsNew={handleSaveScene}
            onDeleteScene={handleDeleteScene}
            onOpenConfig={() => setIsConfigModalOpen(true)}
            onClose={() => setIsScenesPanelOpen(false)}
          />
        )}

        {/* Sidebar Turno de Combate */}
        <BattleMapSidebar 
          participants={displayParticipants} 
          isOpen={activePanel === 'participants'} 
          onOpenChar={onOpenChar} 
          onClose={() => setActivePanel('none')}
          isDM={isDM}
          onNextTurn={() => toast.info("Pasando turno...")}
          activeParticipantId={activeParticipantId}
        />

        {/* Projection Menu */}
        {projectionMenu && (
          <BattleMapProjectionMenu 
            x={projectionMenu.x} 
            y={projectionMenu.y}
            onSelect={(type) => {
              const event = new CustomEvent('start-projection', { detail: { type, tokenId: projectionMenu.tokenId } });
              window.dispatchEvent(event);
              setProjectionMenu(null);
            }}
            onClose={() => setProjectionMenu(null)}
          />
        )}

        {/* Enhanced Log */}
        <BattleMapLog 
          logs={logs} 
          nameOverrides={nameOverrides} 
          onOpenChar={onOpenChar} 
        />

        {/* Floating Dice Button */}
        <div className="fixed bottom-20 right-4 z-[70] animate-in slide-in-from-right-5 duration-500">
          <BattleMapDiceButton onClick={handleDiceClick} />
        </div>

        {/* Selected Entity Sheet (Enemy/NPC) */}
        {selectedEntityForSheet && (
          isDM ? (
            <EnemyCombatSheetModal 
              participant={selectedEntityForSheet}
              encounter={combat.encounter!}
              participants={combat.participants}
              groups={combat.groups}
              pins={combat.pins}
              onClose={() => setSelectedEntityForSheet(null)}
            />
          ) : (
            <EntityPortraitModal 
              participant={selectedEntityForSheet} 
              onClose={() => setSelectedEntityForSheet(null)} 
            />
          )
        )}

        {/* Group Summary Modal */}
        {selectedGroupSummary && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" {...backdropProps(() => setSelectedGroupSummary(null))}>
            <div className="ornate-card w-full max-w-sm bg-[#0a0a0c] p-5 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="text-[var(--gold)] w-5 h-5" />
                  <h3 className="font-display text-lg uppercase tracking-widest text-[var(--gold)]">
                    {selectedGroupSummary.name || t('combat.linkBadge')}
                  </h3>
                </div>
                <button onClick={() => setSelectedGroupSummary(null)} className="text-muted-foreground hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="gem-divider opacity-30" />

              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span>{t('combat.initiative')}</span>
                  <span className="text-[var(--gold)] font-bold">{selectedGroupSummary.group_initiative}</span>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t('battleMap.participants')}</p>
                  <div className="grid grid-cols-1 gap-2">
                    {combat.participants.filter(p => p.turn_group_id === selectedGroupSummary.id).map(member => (
                      <button 
                        key={member.id}
                        onClick={() => {
                          if (member.participant_type === 'player' && member.character_id) {
                            onOpenChar(member.character_id);
                          } else {
                            setSelectedEntityForSheet(member);
                          }
                          setSelectedGroupSummary(null);
                        }}
                        className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-left"
                      >
                        <div className="w-8 h-8 rounded-full border-2 overflow-hidden flex-shrink-0" style={{ borderColor: member.color || 'var(--gold)' }}>
                           {member.image_url ? (
                             <img src={member.image_url} alt={member.display_name} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full bg-secondary flex items-center justify-center text-xs">🧙</div>
                           )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-xs truncate" style={{ color: member.color || undefined }}>
                            {member.display_name}
                          </p>
                          {member.is_leader && (
                            <div className="flex items-center gap-1 text-[8px] uppercase tracking-tighter text-[var(--gold)]">
                              <Crown size={8} /> Líder
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button className="btn-fantasy w-full py-2 mt-2" onClick={() => setSelectedGroupSummary(null)}>
                {t('common.close')}
              </button>
            </div>
          </div>
        )}


      </main>

      {/* New Fixed Player Bottom Bar */}
      <BattleMapBottomBar onOpenSection={handleOpenNavSection} />
    </div>
  );
};

export default BattleMap;
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
import { playMapSound } from './BattleMapSounds';
import type { CombatParticipant } from '@/lib/combat';


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
  const [isLogExpanded, setIsLogExpanded] = useState(false);
  const [isRulerActive, setIsRulerActive] = useState(false);


  
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
          x: (Math.random() - 0.5) * (dimensions.width * 0.6),
          y: (Math.random() - 0.5) * (dimensions.height * 0.6)
        });
      }
    });

    setActiveDiceRolls(newRolls);

    // TODO: Phase 6 Integration with actual combat log
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
    // 1. Iniciamos con los participantes reales del combate
    const list = [...combat.participants];
    
    // 2. Agregamos personajes que NO están en combate pero tienen un token invocado en la escena
    // O que el usuario actual decida invocar ahora
    const summonedIdsInScene = Object.keys(remoteTokenPositions);
    
    characters.forEach(char => {
      // Si el personaje ya está como participante de combate, lo saltamos
      if (list.some(p => p.character_id === char.id)) return;
      
      // Si el personaje tiene un token en esta escena, lo agregamos como "participante virtual"
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
          // Mapeamos los campos de imagen del personaje para el token
          image_offset_x: (char as any).image_offset_x,
          image_offset_y: (char as any).image_offset_y,
          image_scale: char.image_scale,
        } as any);
      }
    });

    return list;
  }, [combat.participants, remoteTokenPositions, characters, campaign?.id, combat.encounter?.id]);

  const orderedTurns = useMemo(() => {
    // Solo mostramos el orden de turnos si hay un combate activo
    if (!combat.encounter || combat.encounter.status !== 'active') return [];
    return buildOrderedTurns(combat.participants, combat.groups, combat.pins);
  }, [combat.participants, combat.groups, combat.pins, combat.encounter?.status]);

  const activeBlockIndex = useMemo(() => {
    if (!combat.encounter || combat.encounter.status !== 'active' || orderedTurns.length === 0) return -1;
    return ((combat.encounter.current_turn_index % orderedTurns.length) + orderedTurns.length) % orderedTurns.length;
  }, [combat.encounter, orderedTurns]);

  const handleToggleMyToken = useCallback(() => {
    if (!character?.id) return;
    const isSummoned = !!remoteTokenPositions[character.id];
    
    if (isSummoned) {
      // Retirar
      const newState = { ...remoteTokenPositions };
      delete newState[character.id];
      setRemoteTokenPositions(newState);
      handleBroadcastMove(character.id, -9999, -9999); // Usamos una posición especial para "retirar" si es necesario, o simplemente informamos
      toast.success(t("battleMap.tokenRemoved") || "Token retirado");
    } else {
      // Invocar
      const pos = { x: dimensions.width / 2, y: dimensions.height / 2 };
      setRemoteTokenPositions(prev => ({ ...prev, [character.id]: pos }));
      handleBroadcastMove(character.id, pos.x, pos.y);
      toast.success(t("battleMap.tokenSummoned") || "Token invocado");
    }
    handleUpdateCurrentSceneState();
  }, [character?.id, remoteTokenPositions, dimensions, handleBroadcastMove, handleUpdateCurrentSceneState, t]);



  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0c] flex flex-col overflow-hidden text-foreground animate-in fade-in duration-300">
      <BattleMapHeader 
        title={headerTitle} 
        onBack={async () => {
          if (isDM) await handleUpdateCurrentSceneState();
          onBack();
        }} 
        onMenuToggle={toggleParticipants} 
        onlineCount={onlineIds.size}
      />

      <main className="flex-1 relative overflow-hidden bg-[#050507]">
        {/* FASE 7: Canvas Stage */}
        <div className="absolute inset-0 z-0">
          <BattleMapStage 
            width={dimensions.width} 
            height={dimensions.height - 56} 
            participants={combat.participants}
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
          />
        </div>

        {/* FASE 7: Empty State Feedback */}
        {!mapConfig.backgroundUrl && isDM && !isScenesPanelOpen && !isDicePanelOpen && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 p-8 rounded-[2rem] text-center max-w-sm pointer-events-auto animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-secondary/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--gold)]/20">
                <Layers className="w-8 h-8 text-[var(--gold)]" />
              </div>
              <h3 className="text-[var(--gold)] font-display text-sm uppercase tracking-[0.2em] mb-2">Escenario Vacío</h3>
              <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-6 leading-relaxed">
                Sube una imagen o video para comenzar tu batalla táctica.
              </p>
              <button 
                 onClick={() => setIsScenesPanelOpen(true)}
                 className="btn-fantasy text-[9px] px-6 py-2"
                 style={{ background: 'var(--gradient-gold)', color: 'black' }}
              >
                Gestionar Escenas
              </button>
            </div>
          </div>
        )}

        {/* FASE 7: Turn Rail (Left Side) */}
        <BattleMapTurnRail 
          blocks={orderedTurns} 
          activeBlockIndex={activeBlockIndex} 
        />


        {/* Unified Tool Group */}
        <div className="absolute top-4 right-4 z-40 flex flex-col gap-3 items-end">
            {isDM && (
                <>
                    <button
                      onClick={() => setIsScenesPanelOpen(true)}
                      className={`w-12 h-12 rounded-2xl shadow-2xl transition-all group flex items-center justify-center border ${isScenesPanelOpen ? 'bg-[var(--gold)] text-black border-[var(--gold)]' : 'bg-black/60 backdrop-blur-md text-[var(--gold)] border-white/10 hover:bg-white/5'}`}
                      title="Escenas"
                    >
                      <Layers className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => setIsChalkMode(!isChalkMode)}
                      className={`w-12 h-12 rounded-2xl shadow-2xl transition-all group flex items-center justify-center border ${isChalkMode ? 'bg-[var(--gold)] text-black border-[var(--gold)]' : 'bg-black/60 backdrop-blur-md text-[var(--gold)] border-white/10 hover:bg-white/5'}`}
                      title="Pintar"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={() => setIsConfigModalOpen(true)}
                      className={`w-12 h-12 rounded-2xl shadow-2xl transition-all group flex items-center justify-center border ${isConfigModalOpen ? 'bg-[var(--gold)] text-black border-[var(--gold)]' : 'bg-black/60 backdrop-blur-md text-[var(--gold)] border-white/10 hover:bg-white/5'}`}
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

        {/* Floating Dice Button - Positioned relative to Log */}
        <div 
          className="fixed right-3 z-[45] transition-all duration-300"
          style={{ 
            bottom: isLogExpanded 
              ? (dimensions.width >= 640 ? '268px' : 'calc(40vh + 12px)')
              : '60px'
          }}
        >

          <BattleMapDiceButton onClick={handleDiceClick} />
        </div>


        {/* Panels / Overlays */}
        {(activePanel !== 'none' || isScenesPanelOpen || isDicePanelOpen) && (
          <div className="absolute inset-0 bg-black/60 z-30 transition-opacity animate-in fade-in backdrop-blur-sm" onClick={() => { 
            setActivePanel('none'); 
            setIsScenesPanelOpen(false); 
            setIsDicePanelOpen(false);
          }} />
        )}

        {/* Dice Panel */}
        {isDicePanelOpen && (
          <div className="absolute inset-x-0 bottom-0 z-[70] flex items-end justify-center pointer-events-none">
            <div className="w-full max-w-md pointer-events-auto">
              <BattleMapDicePanel 
                onClose={() => setIsDicePanelOpen(false)}
                onRoll={handleRollDice}
              />
            </div>
          </div>
        )}

        {/* Dice Animation */}
        {activeDiceRolls && (
          <BattleMapDiceAnimation 
            dice={activeDiceRolls} 
            onComplete={() => setActiveDiceRolls(null)} 
          />
        )}

        {/* Chalk Controls (Floating over stage) */}
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
          <div className="absolute left-0 top-0 h-full z-50 animate-in slide-in-from-left duration-300">
            <BattleMapScenesPanel 
              scenes={scenes}
              activeSceneId={activeSceneId || undefined}
              onSelectScene={(id) => {
                const s = scenes.find(sc => sc.id === id);
                if (s) { setActiveSceneId(s.id); applyScene(s); }
              }}
              onActivateScene={handleActivateScene}
              onSaveCurrentAsNew={handleSaveScene}
              onDeleteScene={handleDeleteScene}
              onClose={() => setIsScenesPanelOpen(false)}
            />
          </div>
        )}

        {/* Sidebar Participantes */}
        <div className={`absolute left-0 top-0 h-full z-50 transition-transform duration-300 transform ${activePanel === 'participants' ? 'translate-x-0' : '-translate-x-full'}`}>
          <BattleMapSidebar participants={combat.participants} isOpen={true} onOpenChar={onOpenChar} onClose={() => setActivePanel('none')} />
        </div>

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

        {/* Colapsable Log */}
        <div 
          className={`absolute bottom-0 left-0 right-0 z-40 transition-all duration-300 bg-[#0a0a0c]/95 border-t border-white/10 backdrop-blur-md ${isLogExpanded ? 'h-[40vh] sm:h-64' : 'h-12'}`}
        >
          <div 
            className="flex items-center justify-between px-4 py-1.5 border-b border-white/5 bg-white/5 cursor-pointer group"
            onClick={() => setIsLogExpanded(!isLogExpanded)}
          >
            <span className="text-[10px] font-display uppercase tracking-[0.2em] text-muted-foreground group-hover:text-[var(--gold)] transition-colors">{t("battleMap.recentLog")}</span>
            <div className="p-1 rounded-full bg-white/5 border border-white/10 text-[var(--gold)] group-hover:scale-110 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isLogExpanded ? 'rotate-180' : ''}`}><polyline points="18 15 12 9 6 15"/></svg>
            </div>
          </div>
          <div className="h-[calc(100%-2rem)] overflow-hidden">
             <BattleMapLog logs={logs} nameOverrides={nameOverrides} onOpenChar={onOpenChar} isExpanded={isLogExpanded} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default BattleMap;

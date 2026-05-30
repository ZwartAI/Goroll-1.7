import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Pencil, Layers, LogOut } from 'lucide-react';
import { useGameData } from '@/lib/useGame';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import type { LogRow } from '@/lib/game';
import { BattleMapHeader } from './BattleMapHeader';
import { BattleMapSidebar } from './BattleMapSidebar';
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
  const { combat, campaign, character } = useGameData();
  const { t } = useT();
  const [activePanel, setActivePanel] = useState<'none' | 'participants'>('none');
  const [isScenesPanelOpen, setIsScenesPanelOpen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isLogExpanded, setIsLogExpanded] = useState(false);
  
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

  const handleDiceClick = useCallback(() => console.log("Abrir panel de dados"), []);

  const toggleParticipants = useCallback(() => setActivePanel(prev => prev === 'participants' ? 'none' : 'participants'), []);

  // FASE 4: Chalk Handlers
  const handleAddChalkLine = useCallback((line: ChalkLine) => setChalkLines(prev => [...prev, line]), []);
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
      setChalkNotes(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), x, y, text }]);
    }
  }, []);

  const handleNoteUpdate = useCallback((id: string, x: number, y: number) => {
    setChalkNotes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
  }, []);

  const handleNoteDelete = useCallback((id: string) => setChalkNotes(prev => prev.filter(n => n.id !== id)), []);

  const sortedParticipants = useMemo(() => {
    return [...combat.participants].sort((a, b) => (b.initiative || 0) - (a.initiative || 0));
  }, [combat.participants]);

  const currentTurnId = sortedParticipants[0]?.id;

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0c] flex flex-col overflow-hidden text-foreground animate-in fade-in duration-300">
      <BattleMapHeader title={headerTitle} onBack={onBack} onMenuToggle={toggleParticipants} />

      <main className="flex-1 relative overflow-hidden">
        {/* Turn Tracker */}
        <div className="absolute left-0 top-1/4 z-40 flex flex-col gap-1 pointer-events-none">
          {sortedParticipants.slice(0, 12).map((p, idx) => {
            const isTurn = p.id === currentTurnId;
            const color = p.enemy_color || p.color || "var(--gold)";
            return (
              <div key={p.id} className={`pointer-events-auto group flex items-center transition-all duration-300 transform ${isTurn ? 'translate-x-0' : '-translate-x-[85%] hover:translate-x-0'}`}>
                <div className={`px-2.5 py-1.5 rounded-r-full font-display text-[9px] uppercase tracking-widest shadow-lg flex items-center gap-2 ${isTurn ? 'bg-secondary/90 border-y border-r border-white/20' : 'bg-black/60 border-y border-r border-white/10 opacity-60 hover:opacity-100'}`} style={{ borderRightColor: color }}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center border border-white/20 ${isTurn ? 'bg-[var(--gold)] text-black' : 'bg-black/40 text-muted-foreground'}`}>{idx + 1}</div>
                  <span className="truncate max-w-[60px]" style={{ color }}>{p.display_name}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Overlay */}
        {(activePanel !== 'none' || isScenesPanelOpen) && (
          <div className="absolute inset-0 bg-black/40 z-30 transition-opacity animate-in fade-in" onClick={() => { setActivePanel('none'); setIsScenesPanelOpen(false); }} />
        )}

        {/* Panel Escenas */}
        {isScenesPanelOpen && (
          <div className="absolute left-0 top-0 h-full z-50">
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
          <BattleMapSidebar participants={sortedParticipants} isOpen={true} onOpenChar={onOpenChar} onClose={() => setActivePanel('none')} />
        </div>

        {/* Canvas */}
        <div className="w-full h-full">
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
            // FASE 5 Props
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

        {/* Menú Proyecciones */}
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

        {/* DM Controls */}
        {isDM && (
          <div className="absolute bottom-20 right-4 flex flex-col gap-2 z-40">
            <BattleMapConfigModal config={mapConfig} onChange={setMapConfig} />
            
            <button
              onClick={() => setIsScenesPanelOpen(true)}
              className="bg-[#1a1a1e]/90 hover:bg-[var(--gold)] hover:text-black border border-white/10 p-4 rounded-full shadow-2xl transition-all group"
            >
              <Layers className="w-6 h-6 text-[var(--gold)] group-hover:text-black" />
            </button>

            {!isChalkMode ? (
              <button
                onClick={() => setIsChalkMode(true)}
                className="bg-[#1a1a1e]/90 hover:bg-[var(--gold)] hover:text-black border border-white/10 p-4 rounded-full shadow-2xl transition-all group"
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
          </div>
        )}

        {/* Dice & Log */}
        <BattleMapDiceButton onClick={handleDiceClick} />
        
        <div 
          className={`absolute bottom-0 left-0 right-0 z-40 transition-all duration-300 bg-[#0a0a0c]/90 border-t border-white/10 backdrop-blur-md cursor-pointer ${isLogExpanded ? 'h-64' : 'h-14'}`}
          onClick={() => setIsLogExpanded(!isLogExpanded)}
        >
          <div className="absolute top-0 right-4 -translate-y-1/2">
            <div className="p-1.5 rounded-full bg-black/60 border border-white/10 text-[var(--gold)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isLogExpanded ? 'rotate-180' : ''}`}><polyline points="18 15 12 9 6 15"/></svg>
            </div>
          </div>
          <div className="h-full overflow-hidden">
             <BattleMapLog logs={logs} nameOverrides={nameOverrides} onOpenChar={onOpenChar} isExpanded={isLogExpanded} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default BattleMap;

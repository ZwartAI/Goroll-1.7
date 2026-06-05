import React, { useEffect, useRef, useState } from 'react';
import { MousePointer2, Ruler, Pencil, UserPlus, UserMinus, Settings, Layers, Trash2, Crosshair, Eraser, ChevronRight, Box, Circle, Triangle, LineChart, Magnet, MousePointerSquareDashed, X, Cloud, Sun, CloudRain, CloudLightning, Radiation, Flame, Moon, Snowflake, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useT } from '@/lib/i18n';

export type MapTool = 'move' | 'multi-move' | 'measure' | 'pencil' | 'eraser';
export type MeasureMode = 'line' | 'cone' | 'circle';

interface Props {
  activeTool: MapTool;
  setActiveTool: (tool: MapTool) => void;
  measureMode: MeasureMode;
  setMeasureMode: (mode: MeasureMode) => void;
  measureSnap: boolean;
  setMeasureSnap: (snap: boolean) => void;
  isDM: boolean;
  onOpenScenes: () => void;
  onOpenSettings: () => void;
  onInvokeToken: (tokenToPlace?: any) => void;
  onResetView: () => void;
  onClearDrawings: (options?: { authorId?: string, all?: boolean }) => void;
  onUndoDrawing: () => void;
  characterId?: string;
  authorName?: string;
  authorColor?: string;
  onOpenDice: () => void;
  hasMyToken: boolean;
  hasBackground: boolean;
  drawings?: any[];
  showToolbar?: boolean;
  selectedTokensCount?: number;
  onClearSelection?: () => void;
  hasMeasurements?: boolean;
  onClearMeasurements?: () => void;
  weatherEffect?: string;
  weatherIntensity?: string;
  onChangeWeather?: (effect: string, intensity: string) => void;
  canChangeWeather?: boolean;
}


export function Toolbar({ 
  activeTool, 
  setActiveTool, 
  measureMode,
  setMeasureMode,
  measureSnap,
  setMeasureSnap,
  isDM, 
  onOpenScenes, 
  onOpenSettings, 
  onInvokeToken,
  onResetView,
  onClearDrawings,
  onUndoDrawing,
  onOpenDice,
  hasMyToken,
  hasBackground,
  characterId,
  authorName,
  authorColor,
  drawings = [],
  showToolbar = true,
  selectedTokensCount = 0,
  onClearSelection,
  hasMeasurements = false,
  onClearMeasurements,
  weatherEffect = 'none',
  weatherIntensity = 'medium',
  onChangeWeather,
  canChangeWeather = false,
}: Props) {
  const { t } = useT();
  const [pencilMenuOpen, setPencilMenuOpen] = useState(false);
  const [measureMenuOpen, setMeasureMenuOpen] = useState(false);
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const [weatherMenuOpen, setWeatherMenuOpen] = useState(false);
  const [showClearModal, setShowClearModal] = useState<'mine' | 'all' | 'player' | null>(null);

  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);

  const isPencilActive = activeTool === 'pencil' || activeTool === 'eraser';
  const isMoveActive = activeTool === 'move' || activeTool === 'multi-move';

  // Long-press detection for the Move button
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const startMoveLongPress = () => {
    if (!isDM) return;
    longPressFired.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setMoveMenuOpen(true);
    }, 450);
  };
  const cancelMoveLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };
  const handleMoveClick = () => {
    if (longPressFired.current) { longPressFired.current = false; return; }
    setActiveTool('move');
    setMoveMenuOpen(false);
    setPencilMenuOpen(false);
    setMeasureMenuOpen(false);
  };


  const authors = React.useMemo(() => {
    const authorMap = new Map<string, { id: string, name: string, color: string, count: number }>();
    
    drawings.forEach(d => {
      const id = d.author_character_id || 'unknown';
      const existing = authorMap.get(id);
      if (existing) {
        existing.count++;
      } else {
        authorMap.set(id, {
          id,
          name: d.author_name || (id === 'unknown' ? 'Autor Desconocido' : 'Jugador'),
          color: d.author_color || d.color || '#FFD700',
          count: 1
        });
      }
    });
    
    return Array.from(authorMap.values());
  }, [drawings]);

  return (
    <>
      <div className={cn(
        "absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-30 transition-all duration-300",
        !showToolbar && "translate-x-[150%] opacity-0 pointer-events-none"
      )} data-map-ui="true">



        <div className="flex flex-col gap-2 p-2 bg-black/60 backdrop-blur-md border border-[var(--gold)]/30 rounded-xl shadow-2xl" data-map-ui="true">
          <div className="relative">
            <div
              onPointerDown={startMoveLongPress}
              onPointerUp={cancelMoveLongPress}
              onPointerLeave={cancelMoveLongPress}
              onPointerCancel={cancelMoveLongPress}
              onContextMenu={(e) => { e.preventDefault(); if (isDM) setMoveMenuOpen(true); }}
            >
              <ToolButton
                active={isMoveActive}
                onClick={handleMoveClick}
                icon={<MousePointer2 className="w-5 h-5" />}
                label={t('battleMap.tools.move')}
              />
            </div>

            {/* Selected count badge */}
            {activeTool === 'multi-move' && selectedTokensCount > 0 && (
              <div className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--gold)] text-black text-[9px] font-bold flex items-center justify-center shadow-lg pointer-events-none">
                {selectedTokensCount}
              </div>
            )}

            {/* Long-press / right-click flyout (horizontal, to the LEFT) */}
            <AnimatePresence>
              {moveMenuOpen && isDM && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="absolute right-full mr-3 top-0 flex items-center gap-2 p-2 bg-black/85 backdrop-blur-xl border border-[var(--gold)]/30 rounded-xl shadow-2xl"
                >
                  <ToolButton
                    active={activeTool === 'multi-move'}
                    onClick={() => {
                      setActiveTool('multi-move');
                      setMoveMenuOpen(false);
                      setPencilMenuOpen(false);
                      setMeasureMenuOpen(false);
                    }}
                    icon={<MousePointerSquareDashed className="w-5 h-5" />}
                    label={t('battleMap.tools.multiMove')}
                  />
                  {activeTool === 'multi-move' && selectedTokensCount > 0 && (
                    <button
                      onClick={() => { onClearSelection?.(); }}
                      className="flex items-center gap-1 px-2 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[9px] uppercase tracking-tight transition-colors"
                      title={t('battleMap.tools.clearSelection')}
                    >
                      <X className="w-3 h-3" />
                      {t('battleMap.tools.selected', { n: String(selectedTokensCount) })}
                    </button>
                  )}
                  <button
                    onClick={() => setMoveMenuOpen(false)}
                    className="text-white/40 hover:text-white p-1"
                    aria-label="close"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          
          <div className="relative group/measure">
            <ToolButton 
              active={activeTool === 'measure'} 
              onClick={() => {
                if (activeTool !== 'measure') {
                  setActiveTool('measure');
                }
                setMeasureMenuOpen(!measureMenuOpen);
                setPencilMenuOpen(false);
              }}

              icon={<Ruler className="w-5 h-5" />}
              label="Regla"
            />
            
            <AnimatePresence>
              {measureMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="absolute right-full mr-3 top-0 flex flex-col gap-2 p-2 bg-black/80 backdrop-blur-xl border border-[var(--gold)]/30 rounded-xl shadow-2xl min-w-[120px]"
                >
                  {hasMeasurements && (
                    <button
                      onClick={() => onClearMeasurements?.()}
                      className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 text-red-300 hover:text-red-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="text-[10px] uppercase tracking-tight font-semibold">
                        {t('battleMap.tools.eraseMarkers')}
                      </span>
                    </button>
                  )}
                  <div className="flex flex-col gap-1">
                    <ToolButton 
                      active={measureMode === 'line'} 
                      onClick={() => setMeasureMode('line')}
                      icon={<LineChart className="w-4 h-4" />}
                      label="Línea Recta"
                      small
                    />
                    <ToolButton 
                      active={measureMode === 'cone'} 
                      onClick={() => setMeasureMode('cone')}
                      icon={<Triangle className="w-4 h-4" />}
                      label="Cono (53°)"
                      small
                    />
                    <ToolButton 
                      active={measureMode === 'circle'} 
                      onClick={() => setMeasureMode('circle')}
                      icon={<Circle className="w-4 h-4" />}
                      label="Área (Círculo)"
                      small
                    />
                    
                    <div className="h-px bg-[var(--gold)]/10 my-1" />
                    
                    <ToolButton 
                      active={measureSnap} 
                      onClick={() => setMeasureSnap(!measureSnap)}
                      icon={<Magnet className="w-4 h-4" />}
                      label={measureSnap ? "Ajuste a Rejilla: ON" : "Ajuste a Rejilla: OFF"}
                      small
                      className={measureSnap ? "bg-[var(--gold)]/20 border-[var(--gold)]/40" : ""}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="relative group/pencil">
            <ToolButton 
              active={isPencilActive} 
              onClick={() => {
                if (activeTool !== 'pencil' && activeTool !== 'eraser') {
                  setActiveTool('pencil');
                }
                setPencilMenuOpen(!pencilMenuOpen);
                setMeasureMenuOpen(false);
              }}

              icon={<Pencil className="w-5 h-5" />}
              label="Dibujo"
            />
            
            <AnimatePresence>
              {pencilMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="absolute right-full mr-3 top-0 flex flex-col gap-2 p-2 bg-black/80 backdrop-blur-xl border border-[var(--gold)]/30 rounded-xl shadow-2xl min-w-[120px]"
                >
                  <div className="flex flex-col gap-1 mb-2 border-b border-[var(--gold)]/10 pb-2">
                    <ToolButton 
                      active={activeTool === 'pencil'} 
                      onClick={() => setActiveTool('pencil')}
                      icon={<Pencil className="w-4 h-4" />}
                      label="Lápiz"
                      small
                    />
                    <ToolButton 
                      active={activeTool === 'eraser'} 
                      onClick={() => setActiveTool('eraser')}
                      icon={<Eraser className="w-4 h-4" />}
                      label="Goma / Gestionar"
                      small
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={onUndoDrawing}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--gold)]/10 text-[var(--gold)]/70 hover:text-[var(--gold)] transition-colors text-left"
                    >
                      <Trash2 className="w-3.5 h-3.5 opacity-60" />
                      <span className="text-[9px] uppercase tracking-tighter">Deshacer</span>
                    </button>

                    <button 
                      onClick={() => setShowClearModal('mine')}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--gold)]/10 text-[var(--gold)]/70 hover:text-[var(--gold)] transition-colors text-left"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="text-[9px] uppercase tracking-tighter">Borrar mis dibujos</span>
                    </button>

                    {isDM && (
                      <>
                        <div className="h-px bg-[var(--gold)]/10 my-1" />
                        {authors.filter(a => a.id !== characterId).map(author => (
                          <button 
                            key={author.id}
                            onClick={() => {
                              setSelectedAuthorId(author.id);
                              setShowClearModal('player');
                            }}
                            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-red-500/10 text-red-400/70 hover:text-red-400 transition-colors text-left group"
                          >
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: author.color }} />
                            <span className="text-[9px] uppercase tracking-tighter flex-1 truncate">{author.name}</span>
                            <span className="text-[8px] opacity-40 group-hover:opacity-100">{author.count}</span>
                          </button>
                        ))}
                        
                        <button 
                          onClick={() => setShowClearModal('all')}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-red-500/20 text-red-500 transition-colors text-left mt-1 border border-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[9px] uppercase tracking-tighter font-bold">Borrar Todo</span>
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <ToolButton 

            active={false} 
            onClick={onResetView}
            icon={<Crosshair className="w-5 h-5" />}
            label={t('battleMap.tools.center') || 'Centrar'}
          />

          {/* Weather tool */}
          <div className="relative">
            <ToolButton
              active={weatherEffect !== 'none'}
              onClick={() => {
                if (!canChangeWeather && weatherEffect === 'none') return;
                setWeatherMenuOpen(v => !v);
                setMeasureMenuOpen(false);
                setPencilMenuOpen(false);
                setMoveMenuOpen(false);
              }}
              icon={<WeatherIcon effect={weatherEffect} />}
              label={t('battleMap.weather.title') || 'Clima'}
            />
            <AnimatePresence>
              {weatherMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="absolute right-full mr-3 top-0 flex flex-col gap-2 p-2 bg-black/85 backdrop-blur-xl border border-[var(--gold)]/30 rounded-xl shadow-2xl min-w-[180px]"
                >
                  <div className="text-[10px] uppercase tracking-widest text-[var(--gold)]/80 px-1 pb-1 border-b border-[var(--gold)]/15">
                    {t('battleMap.weather.title') || 'Clima'}
                  </div>
                  <div className="flex flex-col gap-1">
                    {([
                      { id: 'none',      icon: <CloudOff className="w-4 h-4" />,        label: t('battleMap.weather.none') || 'Ninguno' },
                      { id: 'sunny',     icon: <Sun className="w-4 h-4" />,             label: t('battleMap.weather.sunny') || 'Soleado' },
                      { id: 'rain',      icon: <CloudRain className="w-4 h-4" />,       label: t('battleMap.weather.rain') || 'Lluvioso' },
                      { id: 'storm',     icon: <CloudLightning className="w-4 h-4" />,  label: t('battleMap.weather.storm') || 'Tormenta' },
                      { id: 'radiation', icon: <Radiation className="w-4 h-4" />,       label: t('battleMap.weather.radiation') || 'Radiación' },
                      { id: 'volcanic',  icon: <Flame className="w-4 h-4" />,           label: t('battleMap.weather.volcanic') || 'Glow Volcánico' },
                      { id: 'night',     icon: <Moon className="w-4 h-4" />,            label: t('battleMap.weather.night') || 'Nocturno' },
                      { id: 'snow',      icon: <Snowflake className="w-4 h-4" />,       label: t('battleMap.weather.snow') || 'Nevado' },
                    ] as const).map(opt => (
                      <button
                        key={opt.id}
                        disabled={!canChangeWeather}
                        onClick={() => {
                          onChangeWeather?.(opt.id, weatherIntensity);
                          setWeatherMenuOpen(false);
                        }}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded transition-colors text-left",
                          weatherEffect === opt.id
                            ? "bg-[var(--gold)]/20 text-[var(--gold)]"
                            : "text-white/70 hover:bg-white/5 hover:text-white",
                          !canChangeWeather && "opacity-60 cursor-not-allowed"
                        )}
                      >
                        {opt.icon}
                        <span className="text-[10px] uppercase tracking-tight flex-1">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                  {canChangeWeather && weatherEffect !== 'none' && (
                    <>
                      <div className="h-px bg-[var(--gold)]/15 my-1" />
                      <div className="text-[9px] uppercase tracking-widest text-white/50 px-1">
                        {t('battleMap.weather.intensity') || 'Intensidad'}
                      </div>
                      <div className="flex gap-1">
                        {(['low','medium','high'] as const).map(int => (
                          <button
                            key={int}
                            onClick={() => onChangeWeather?.(weatherEffect, int)}
                            className={cn(
                              "flex-1 px-2 py-1 rounded text-[9px] uppercase tracking-tight transition-colors",
                              weatherIntensity === int
                                ? "bg-[var(--gold)]/25 text-[var(--gold)] border border-[var(--gold)]/40"
                                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-transparent"
                            )}
                          >
                            {t(`battleMap.weather.${int}`) || int}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>


        <div className="flex flex-col gap-2 p-2 bg-black/60 backdrop-blur-md border border-[var(--gold)]/30 rounded-xl shadow-2xl" data-map-ui="true">
          {isDM && (
            <ToolButton 
              active={false} 
              onClick={onOpenScenes}
              icon={<Layers className="w-5 h-5" />}
              label="Escenas"
            />
          )}
          <ToolButton 
            active={false} 
            onClick={onOpenSettings}
            icon={<Settings className="w-5 h-5" />}
            label="Ajustes"
          />
        </div>
      </div>

      <AnimatePresence>
        {showClearModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-black/90 border border-[var(--gold)]/40 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4"
            >
              <h3 className="text-[var(--gold)] font-display text-lg mb-2">Borrar Dibujos</h3>
              <p className="text-white/70 text-sm mb-6">
                {showClearModal === 'all' 
                  ? '¿Quieres eliminar TODOS los dibujos de esta escena?' 
                  : showClearModal === 'player'
                  ? `¿Quieres eliminar todos los dibujos de este jugador?`
                  : '¿Quieres eliminar todos tus dibujos en esta escena?'}

              </p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setShowClearModal(null)}
                  className="px-4 py-2 rounded-lg text-white/60 hover:text-white transition-colors text-sm uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    onClearDrawings(
                      showClearModal === 'all' 
                        ? { all: true } 
                        : showClearModal === 'player'
                        ? { authorId: selectedAuthorId || undefined }
                        : { authorId: characterId || 'unknown' }
                    );
                    setShowClearModal(null);
                  }}


                  className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors text-sm uppercase tracking-wider"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  small?: boolean;
  className?: string;
}

function ToolButton({ icon, label, active, onClick, small, className }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center rounded-lg transition-all relative group",
        small ? "w-8 h-8" : "w-10 h-10",
        active 
          ? "bg-[var(--gold)] text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]" 
          : "text-white/70 hover:bg-white/10 hover:text-white",
        className
      )}
    >
      {icon}
      
      <div className="absolute right-full mr-3 px-2 py-1 bg-black/90 text-white text-[10px] uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-[var(--gold)]/20 shadow-2xl">
        {label}
      </div>
    </button>
  );
}

import React, { useState } from 'react';
import { MousePointer2, Ruler, Pencil, UserPlus, UserMinus, Settings, Layers, Trash2, Crosshair, Eraser, ChevronRight, Box, Circle, Triangle, LineChart, Magnet, Cloud, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export type MapTool = 'move' | 'measure' | 'pencil' | 'eraser' | 'fogPaint' | 'fogErase';
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
  onClearFog: () => void;
  characterId?: string;
  authorName?: string;
  authorColor?: string;
  onOpenDice: () => void;
  hasMyToken: boolean;
  hasBackground: boolean;
  drawings?: any[];
  brushSize: number;
  setBrushSize: (size: number) => void;
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
  onClearFog,
  onOpenDice,
  hasMyToken,
  hasBackground,
  characterId,
  authorName,
  authorColor,
  drawings = [],
  brushSize,
  setBrushSize
}: Props) {
  const [pencilMenuOpen, setPencilMenuOpen] = useState(false);
  const [measureMenuOpen, setMeasureMenuOpen] = useState(false);
  const [fogMenuOpen, setFogMenuOpen] = useState(false);
  const [showClearModal, setShowClearModal] = useState<'mine' | 'all' | 'player' | null>(null);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);

  const isPencilActive = activeTool === 'pencil' || activeTool === 'eraser';
  const isFogActive = activeTool === 'fogPaint' || activeTool === 'fogErase';

  // Extract unique authors for DM management
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

  // Get unique authors from drawings to show in DM clear menu
  // Since Toolbar doesn't have drawings, we might need to pass them or the list of authors.
  // For now, let's assume DM can clear "All" or "Mine". 
  // To clear specific player, we need the list of authors.
  // Let's modify Props to include drawings or a derived author list.

  return (
    <>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-30" data-map-ui="true">
        <div className="flex flex-col gap-2 p-2 bg-black/60 backdrop-blur-md border border-[var(--gold)]/30 rounded-xl shadow-2xl" data-map-ui="true">
          <ToolButton 
            active={activeTool === 'move'} 
            onClick={() => {
              setActiveTool('move');
              setPencilMenuOpen(false);
              setMeasureMenuOpen(false);
            }}
            icon={<MousePointer2 className="w-5 h-5" />}
            label="Mover"
          />
          
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
                      label="Cono (60°)"
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
            label="Centrar"
            className="border-white/10"
          />

          <ToolButton 
            active={false} 
            onClick={onOpenDice}
            icon={<Box className="w-5 h-5" />}
            label="Dados"
            className="border-[var(--gold)]/20 shadow-[0_0_10px_rgba(234,179,8,0.1)]"
          />
        </div>

        <div className="flex flex-col gap-2 p-2 bg-black/60 backdrop-blur-md border border-[var(--gold)]/30 rounded-xl shadow-2xl" data-map-ui="true">
          <ToolButton 
            active={false}
            onClick={() => {
              if (hasMyToken) {
                onInvokeToken();
              } else {
                // Create the template for placement
                onInvokeToken({
                  character_id: null, // characterId will be filled by parent
                  name: '', // Will be filled by parent
                  token_type: 'player'
                });
              }
            }}
            icon={hasMyToken ? <UserMinus className="w-5 h-5 text-red-400" /> : <UserPlus className="w-5 h-5 text-green-400" />}
            label={hasMyToken ? "Retirar" : "Invocar"}
            className={hasMyToken ? "border-red-500/30" : "border-green-500/30"}
          />
        </div>

        {isDM && (
          <div className="flex flex-col gap-2 p-2 bg-black/60 backdrop-blur-md border border-[var(--gold)]/30 rounded-xl shadow-2xl" data-map-ui="true">
            <ToolButton 
              active={false}
              onClick={onOpenScenes}
              icon={<Layers className="w-5 h-5" />}
              label="Escenas"
            />
            <ToolButton 
              active={false}
              onClick={onOpenSettings}
              icon={<Settings className="w-5 h-5" />}
              label="Config"
            />
          </div>
        )}
      </div>

      {/* Confirmation Modals - Moved outside the transformed container to fix mobile centering */}
      <AnimatePresence>
        {showClearModal && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-black/95 border border-[var(--gold)]/30 p-6 rounded-2xl max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,0.8)] border-t-[var(--gold)]/50 pointer-events-auto"
            >
              <h3 className="font-display text-[var(--gold)] text-sm uppercase tracking-widest mb-4">
                {showClearModal === 'mine' ? '¿Borrar tus dibujos?' : 
                 showClearModal === 'all' ? '¿Borrar TODOS los dibujos?' : 
                 `¿Borrar dibujos de ${authors.find(a => a.id === selectedAuthorId)?.name}?`}
              </h3>
              
              <p className="text-white/60 text-xs mb-8">
                {showClearModal === 'all' ? 
                  'Esta acción limpiará todos los trazos de la escena actual para todos los jugadores. No se puede deshacer.' : 
                  'Esta acción eliminará permanentemente los trazos seleccionados en esta escena.'}
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowClearModal(null)}
                  className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-white/40 text-[10px] uppercase tracking-widest hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    if (showClearModal === 'mine') onClearDrawings({ authorId: characterId });
                    else if (showClearModal === 'all') onClearDrawings({ all: true });
                    else if (showClearModal === 'player') onClearDrawings({ authorId: selectedAuthorId! });
                    setShowClearModal(null);
                    setPencilMenuOpen(false);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white text-[10px] uppercase tracking-widest font-bold hover:bg-red-600 transition-colors"
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

function ToolButton({ 

  active, 
  onClick, 
  icon, 
  label, 
  className,
  small = false
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
  className?: string;
  small?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "relative group flex items-center justify-center rounded-lg transition-all duration-300 border border-transparent",
        small ? "w-8 h-8" : "w-10 h-10",
        active ? "bg-[var(--gold)] text-black border-[var(--gold)] shadow-[0_0_15px_rgba(234,179,8,0.4)]" : "text-[var(--gold)]/70 hover:bg-[var(--gold)]/10 hover:border-[var(--gold)]/40 hover:text-[var(--gold)]",
        className
      )}
      title={label}
    >
      {icon}
      <span className={cn(
        "absolute right-full mr-3 px-2 py-1 bg-black/80 border border-[var(--gold)]/30 rounded uppercase tracking-widest text-[var(--gold)] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50",
        small ? "text-[8px]" : "text-[10px]"
      )}>
        {label}
      </span>
    </button>
  );
}
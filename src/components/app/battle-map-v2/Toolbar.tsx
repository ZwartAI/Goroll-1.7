import React, { useEffect, useRef, useState } from 'react';
import { MousePointer2, Ruler, Pencil, UserPlus, UserMinus, Settings, Layers, Trash2, Crosshair, Eraser, ChevronRight, Box, Circle, Triangle, LineChart, Magnet, MousePointerSquareDashed, X } from 'lucide-react';
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
  showToolbar = true
}: Props) {
  const [pencilMenuOpen, setPencilMenuOpen] = useState(false);
  const [measureMenuOpen, setMeasureMenuOpen] = useState(false);
  const [showClearModal, setShowClearModal] = useState<'mine' | 'all' | 'player' | null>(null);

  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);

  const isPencilActive = activeTool === 'pencil' || activeTool === 'eraser';


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
            label="Centrar"
          />
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

import React, { useState } from 'react';
import { MousePointer2, Ruler, Pencil, UserPlus, UserMinus, Settings, Layers, Trash2, Crosshair, Eraser, ChevronRight, Box } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export type MapTool = 'move' | 'measure' | 'pencil' | 'eraser';

interface Props {
  activeTool: MapTool;
  setActiveTool: (tool: MapTool) => void;
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
}

export function Toolbar({ 
  activeTool, 
  setActiveTool, 
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
  drawings = []
}: Props) {
  const [pencilMenuOpen, setPencilMenuOpen] = useState(false);
  const [showClearModal, setShowClearModal] = useState<'mine' | 'all' | 'player' | null>(null);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);

  const isPencilActive = activeTool === 'pencil' || activeTool === 'eraser';

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
    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-30" data-map-ui="true">
      <div className="flex flex-col gap-2 p-2 bg-black/60 backdrop-blur-md border border-[var(--gold)]/30 rounded-xl shadow-2xl" data-map-ui="true">
        <ToolButton 
          active={activeTool === 'move'} 
          onClick={() => {
            setActiveTool('move');
            setPencilMenuOpen(false);
          }}
          icon={<MousePointer2 className="w-5 h-5" />}
          label="Mover"
        />
        <ToolButton 
          active={activeTool === 'measure'} 
          onClick={() => {
            setActiveTool('measure');
            setPencilMenuOpen(false);
          }}
          icon={<Ruler className="w-5 h-5" />}
          label="Regla"
        />
        
        <div className="relative group/pencil">
          <ToolButton 
            active={isPencilActive} 
            onClick={() => {
              if (activeTool !== 'pencil' && activeTool !== 'eraser') {
                setActiveTool('pencil');
              }
              setPencilMenuOpen(!pencilMenuOpen);
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
                className="absolute right-full mr-3 top-0 flex flex-col gap-2 p-2 bg-black/80 backdrop-blur-xl border border-[var(--gold)]/30 rounded-xl shadow-2xl min-w-[44px]"
              >
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
                  label="Goma"
                  small
                />
                <ToolButton 
                  active={false} 
                  onClick={() => {
                    onClearDrawings();
                    setPencilMenuOpen(false);
                  }}
                  icon={<Trash2 className="w-4 h-4 text-red-400" />}
                  label="Borrar Todo"
                  small
                  className="border-red-500/20"
                />
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
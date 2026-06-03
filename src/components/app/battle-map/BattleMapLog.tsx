import React, { useState } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Maximize2, Minimize2 } from 'lucide-react';
import { LogList } from '@/components/app/LogList';
import { LogSegments } from '@/components/app/LogSegments';
import type { LogRow } from '@/lib/game';
import { useT } from '@/lib/i18n';

interface Props {
  logs: LogRow[];
  nameOverrides?: Record<string, { name: string; color: string }>;
  onOpenItem?: (id: string) => void;
  onOpenBooster?: (id: string) => void;
  onOpenChar?: (id: string) => void;
}

export const BattleMapLog: React.FC<Props> = ({ 
  logs, 
  nameOverrides, 
  onOpenItem, 
  onOpenBooster, 
  onOpenChar
}) => {
  const { t } = useT();
  const [viewMode, setViewMode] = useState<'compact' | 'medium' | 'full'>('compact');

  const heights = {
    compact: 60,
    medium: 220,
    full: 'calc(100vh - 120px)'
  };

  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.y < -50) {
      if (viewMode === 'compact') setViewMode('medium');
    } else if (info.offset.y > 50) {
      if (viewMode === 'medium') setViewMode('compact');
      if (viewMode === 'full') setViewMode('medium');
    }
  };
  const toggleView = () => {
    if (viewMode === 'compact') setViewMode('medium');
    else if (viewMode === 'medium') setViewMode('full');
    else setViewMode('compact');
  };

  return (
    <motion.div 
      layout
      initial={false}
      animate={{ height: heights[viewMode] }}
      className={`
        fixed inset-x-0 bottom-[64px] z-50 bg-[#0a0a0c]/80 backdrop-blur-md border-t border-white/10 flex flex-col
        ${viewMode === 'full' ? 'bottom-0 h-screen !z-[120]' : ''}
      `}
      style={{ boxShadow: '0 -10px 40px rgba(0,0,0,0.4)' }}
    >
      {/* Header / Handle de arrastre */}
      <div className="flex flex-col w-full">
        <motion.div 
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          className="h-2 w-full flex items-center justify-center cursor-ns-resize group"
        >
          <div className="w-12 h-1 rounded-full bg-white/10 group-hover:bg-[var(--gold)]/50 transition-colors" />
        </motion.div>

        <div 
          onClick={toggleView}
          className="px-4 py-1 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors group"
        >
          <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-display group-hover:text-[var(--gold)] transition-colors">
            Registro de campaña
          </span>
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500/20 flex items-center justify-center">
                <div className="w-0.5 h-0.5 rounded-full bg-green-500 animate-pulse" />
             </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col">
        {/* Controles rápidos */}
        <div className="absolute top-0 right-3 z-10 flex gap-2 pt-1">
          <button 
            onClick={() => setViewMode(viewMode === 'full' ? 'medium' : 'full')}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground transition-colors"
          >
            {viewMode === 'full' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>

        <div className={`flex-1 overflow-y-auto px-4 py-2 custom-scrollbar select-text ${viewMode === 'compact' ? 'mask-bottom-fade' : ''}`}>
          <LogList 
            rows={logs} 
            initial={viewMode === 'full' ? 50 : 10} 
            maxH="h-full" 
            empty={t("escenario.noActivity")} 
            renderRow={(l: any) => (
              <div key={l.id} className="text-[10px] leading-relaxed mb-1.5 opacity-90 hover:opacity-100 transition-opacity flex gap-2">
                <span className="text-white/20 text-[8px] font-mono mt-0.5">[{new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                <LogSegments 
                  segments={l.segments as any}
                  nameOverrides={nameOverrides}
                  onItem={(id) => onOpenItem?.(id)}
                  onBooster={(id) => onOpenBooster?.(id)}
                  onChar={(id) => onOpenChar?.(id)} 
                />
              </div>
            )} 
          />
        </div>
      </div>
    </motion.div>
  );
};


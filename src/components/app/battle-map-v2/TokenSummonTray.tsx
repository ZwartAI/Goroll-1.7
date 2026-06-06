import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useT } from '@/lib/i18n';
import type { MapToken } from '@/hooks/useBattleMap';
import type { StageHandle } from './Stage';

export interface QueuedToken extends Partial<MapToken> {
  __queueId: string;
}

interface Props {
  queue: QueuedToken[];
  setQueue: React.Dispatch<React.SetStateAction<QueuedToken[]>>;
  stageRef: React.RefObject<StageHandle | null>;
  gridSize: number;
  snapToGrid: boolean;
  gridOffsetX: number;
  gridOffsetY: number;
  onPlace: (token: Partial<MapToken>) => Promise<void> | void;
}

export const TokenSummonTray: React.FC<Props> = ({ queue, setQueue, stageRef, gridSize, snapToGrid, gridOffsetX, gridOffsetY, onPlace }) => {
  const { t } = useT();

  // Auto-close when empty
  useEffect(() => {
    if (queue.length === 0) return;
  }, [queue.length]);

  if (queue.length === 0) return null;

  const handleDrop = async (token: QueuedToken, e: any, point: { x: number; y: number }) => {
    if (!stageRef.current) return;
    // Prefer native pointer coords; framer's info.point can include scroll
    // depending on browser, which throws the drop off when the page or any
    // ancestor is scrolled or transformed.
    const px = typeof e?.clientX === 'number' ? e.clientX : point.x;
    const py = typeof e?.clientY === 'number' ? e.clientY : point.y;

    const stageElement = document.querySelector('.stage-bg');
    if (!stageElement) return;
    const stageRect = stageElement.parentElement!.getBoundingClientRect();
    const isInside =
      px >= stageRect.left &&
      px <= stageRect.right &&
      py >= stageRect.top &&
      py <= stageRect.bottom;
    if (!isInside) return;

    const world = stageRef.current.screenToWorld(px, py);
    let finalX = world.x - gridSize / 2;
    let finalY = world.y - gridSize / 2;
    if (snapToGrid) {
      finalX = Math.round((finalX - gridOffsetX) / gridSize) * gridSize + gridOffsetX;
      finalY = Math.round((finalY - gridOffsetY) / gridSize) * gridSize + gridOffsetY;
    }

    const { __queueId, ...payload } = token;
    await onPlace({ ...payload, x: finalX, y: finalY });
    setQueue(prev => prev.filter(q => q.__queueId !== __queueId));
  };

  return (
    <div className="fixed inset-x-0 bottom-24 z-[150] pointer-events-none flex items-end justify-center px-4">
      <motion.div
        layout
        initial={{ opacity: 0, y: 40, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.9 }}
        className="pointer-events-auto bg-black/85 backdrop-blur-xl border border-[var(--gold)]/40 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.6)] flex flex-col w-full max-w-[min(92vw,520px)]"
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/5">
          <div className="min-w-0">
            <h3 className="font-display text-[var(--gold)] text-[10px] uppercase tracking-[0.3em] truncate">
              {t('battleMap.summon.trayTitle')}
            </h3>
            <p className="text-[8px] text-white/40 uppercase tracking-widest truncate">
              {t('battleMap.summon.remaining', { n: String(queue.length) })}
            </p>
          </div>
          <button
            onClick={() => setQueue([])}
            className="p-1.5 rounded-lg bg-white/5 text-white/50 hover:text-white transition-colors shrink-0"
            aria-label={t('battleMap.summon.clearAll')}
          >
            <X size={14} />
          </button>
        </div>

        <div className="overflow-x-auto overflow-y-hidden custom-scrollbar">
          <div className="flex items-center gap-3 p-3 min-w-min">
            <AnimatePresence initial={false}>
              {queue.map((token) => (
                <motion.div
                  key={token.__queueId}
                  layout
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.4 }}
                  drag
                  dragSnapToOrigin
                  dragMomentum={false}
                  whileDrag={{ scale: 1.15, zIndex: 200 }}
                  onDragEnd={(e, info) => handleDrop(token, e, info.point)}
                  className="cursor-grab active:cursor-grabbing relative shrink-0 group"
                  title={token.name || ''}
                >
                  <div
                    className="w-14 h-14 rounded-full border-2 overflow-hidden shadow-xl bg-black"
                    style={{ borderColor: token.color || 'var(--gold)' }}
                  >
                    {token.image_url ? (
                      <img src={token.image_url} alt="" className="w-full h-full object-cover pointer-events-none" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl opacity-70">🧙</div>
                    )}
                  </div>
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] font-display uppercase tracking-tight bg-black/80 px-1.5 py-0.5 rounded-full max-w-[70px] truncate border border-white/10">
                    {(token.name || '').split(' ')[0]}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

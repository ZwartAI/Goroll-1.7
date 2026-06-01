import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { MapToken } from '@/hooks/useBattleMap';
import { cn } from '@/lib/utils';
import { Trash2, Maximize2, Minimize2 } from 'lucide-react';

interface Props {
  token: MapToken;
  isDM: boolean;
  canMove: boolean;
  gridSize: number;
  snapToGrid: boolean;
  onMove: (x: number, y: number) => void;
  onRemove: () => void;
  onUpdateSize?: (size: number) => void;
}

export function Token({ token, isDM, canMove, gridSize, snapToGrid, onMove, onRemove, onUpdateSize }: Props) {
  const controls = useAnimation();
  const [isDragging, setIsDragging] = useState(false);
  const [isSlowMove, setIsSlowMove] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef<number>(0);

  const handleDragStart = () => {
    setIsDragging(true);
    startTime.current = Date.now();
    
    // Timer for slow move / long press detection
    pressTimer.current = setTimeout(() => {
      setIsSlowMove(true);
    }, 500);
  };

  const handleDragEnd = (_: any, info: any) => {
    setIsDragging(false);
    if (pressTimer.current) clearTimeout(pressTimer.current);
    
    const dragDuration = Date.now() - startTime.current;
    
    let newX = token.x + info.offset.x;
    let newY = token.y + info.offset.y;

    // If it was a quick drag or snap is enabled (and not slow move)
    const shouldSnap = snapToGrid && (!isSlowMove || dragDuration < 1000);

    if (shouldSnap) {
      newX = Math.round(newX / gridSize) * gridSize;
      newY = Math.round(newY / gridSize) * gridSize;
    }

    setIsSlowMove(false);
    
    // Animate to final position
    controls.start({
      x: newX,
      y: newY,
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    });

    onMove(newX, newY);
  };

  const handleResize = (increment: boolean) => {
    if (!onUpdateSize) return;
    const currentCells = Math.round(token.size / gridSize);
    const newCells = increment ? Math.min(currentCells + 1, 10) : Math.max(currentCells - 1, 1);
    onUpdateSize(newCells * gridSize);
  };

  // Sync animation with token position from props (real-time updates)
  useEffect(() => {
    if (!isDragging) {
      controls.start({
        x: token.x,
        y: token.y,
        transition: { type: 'spring', stiffness: 300, damping: 30 }
      });
    }
  }, [token.x, token.y, isDragging, controls]);

  return (
    <motion.div
      drag={canMove}
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      animate={controls}
      initial={{ x: token.x, y: token.y }}
      className={cn(
        "absolute z-10 cursor-grab active:cursor-grabbing group",
        !token.is_visible && "opacity-50 grayscale",
        isDragging && "z-50 shadow-2xl scale-105"
      )}
      style={{ 
        width: token.size,
        height: token.size
      }}
    >
      <div className="relative w-full h-full rounded-full border-2 border-[var(--gold)] bg-black/40 overflow-hidden shadow-xl group-hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all">
        {token.image_url ? (
          <img 
            src={token.image_url} 
            alt={token.name || 'Token'} 
            className="w-full h-full object-cover select-none pointer-events-none"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl select-none">
            {token.token_type === 'player' ? '🧙' : '👿'}
          </div>
        )}

        {/* Name Label */}
        {token.name && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-black/60 text-[8px] uppercase tracking-tighter text-white whitespace-nowrap rounded pointer-events-none">
            {token.name}
          </div>
        )}

        {/* Slow move indicator */}
        {isSlowMove && isDragging && (
          <div className="absolute inset-0 bg-[var(--gold)]/20 animate-pulse pointer-events-none" />
        )}
      </div>

      {/* Resize & Remove Controls */}
      {isDM && (
        <div className="absolute -top-2 -right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-red-600 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleResize(true); }}
            className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-blue-600 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleResize(false); }}
            className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-blue-600 transition-colors"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { MapToken } from '@/hooks/useBattleMap';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import { debounce } from 'lodash';

interface Props {
  token: MapToken;
  isDM: boolean;
  canMove: boolean;
  gridSize: number;
  snapToGrid: boolean;
  scale?: number;
  gridOffsetX?: number;
  gridOffsetY?: number;
  onMove: (x: number, y: number) => void;
  onRemove: () => void;
  onUpdateSize?: (size: number) => void;
}

export function Token({ 
  token, isDM, canMove, gridSize, snapToGrid, 
  scale, gridOffsetX, gridOffsetY,
  onMove, onRemove, onUpdateSize 
}: Props) {
  const controls = useAnimation();
  const [isDragging, setIsDragging] = useState(false);
  const [isSlowMove, setIsSlowMove] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef<number>(0);

  // Debounced update for real-time movement sync
  const debouncedMove = useRef(
    debounce((x: number, y: number) => {
      onMove(x, y);
    }, 50)
  ).current;

  const handleDragStart = () => {
    setIsDragging(true);
    startTime.current = Date.now();
    
    // Timer for slow move / long press detection (to bypass snap if needed)
    pressTimer.current = setTimeout(() => {
      setIsSlowMove(true);
    }, 500);
  };

  const handleDrag = (_: any, info: any) => {
    const safeScale = scale || 1;
    const newX = token.x + info.offset.x / safeScale;
    const newY = token.y + info.offset.y / safeScale;
    
    // For real-time sync during drag, we update the DB (debounced)
    // Note: This might cause some jitter if the network is slow, but it's what was requested
    debouncedMove(newX, newY);
  };

  const handleDragEnd = (_: any, info: any) => {
    setIsDragging(false);
    if (pressTimer.current) clearTimeout(pressTimer.current);
    
    const dragDuration = Date.now() - startTime.current;
    
    const safeScale = scale || 1;
    let newX = token.x + info.offset.x / safeScale;
    let newY = token.y + info.offset.y / safeScale;

    // Snapping logic: Center the token on the grid cell center
    const shouldSnap = snapToGrid && (!isSlowMove || dragDuration < 1000);

    if (shouldSnap) {
      const gx = gridOffsetX || 0;
      const gy = gridOffsetY || 0;
      
      // Calculate where the center of the token is currently
      const currentCenterX = newX + (token.size / 2);
      const currentCenterY = newY + (token.size / 2);

      // Find the nearest grid cell center
      // Grid cells are at: gx + i*gridSize + gridSize/2
      const snappedCenterX = Math.round((currentCenterX - gx - gridSize/2) / gridSize) * gridSize + gx + gridSize/2;
      const snappedCenterY = Math.round((currentCenterY - gy - gridSize/2) / gridSize) * gridSize + gy + gridSize/2;

      // New top-left position is snapped center minus half token size
      newX = snappedCenterX - (token.size / 2);
      newY = snappedCenterY - (token.size / 2);
    }

    setIsSlowMove(false);
    
    // Animate to final position
    controls.start({
      x: newX,
      y: newY,
      transition: { type: 'spring', stiffness: 400, damping: 35 }
    });

    onMove(newX, newY);
  };

  // Sync animation with token position from props (real-time updates from other users)
  useEffect(() => {
    if (!isDragging) {
      controls.start({
        x: token.x,
        y: token.y,
        transition: { type: 'spring', stiffness: 400, damping: 35 }
      });
    }
  }, [token.x, token.y, isDragging, controls]);

  return (
    <motion.div
      drag={canMove}
      dragMomentum={false}
      dragElastic={0}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      animate={controls}
      initial={{ x: token.x, y: token.y }}
      className={cn(
        "absolute z-10 cursor-grab active:cursor-grabbing group pointer-events-auto",
        !token.is_visible && "opacity-50 grayscale",
        isDragging && "z-50 shadow-2xl scale-110"
      )}
      style={{ 
        width: token.size,
        height: token.size,
        left: 0,
        top: 0
      }}
    >
      <div className="relative w-full h-full rounded-full border-2 border-[var(--gold)] bg-black/60 overflow-hidden shadow-xl group-hover:shadow-[0_0_20px_rgba(234,179,8,0.4)] transition-all">
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
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/80 text-[9px] font-bold uppercase tracking-tighter text-white whitespace-nowrap rounded-t border-t border-x border-[var(--gold)]/30 pointer-events-none">
            {token.name}
          </div>
        )}

        {/* Slow move indicator */}
        {isSlowMove && isDragging && (
          <div className="absolute inset-0 bg-[var(--gold)]/20 animate-pulse pointer-events-none" />
        )}
      </div>

      {/* Control Buttons (Only trash as requested) */}
      {(isDM || canMove) && (
        <div className="absolute -top-3 -right-3 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-[60]">
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-red-600 transition-colors hover:scale-110 active:scale-95"
            title="Eliminar token"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

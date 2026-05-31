import React from 'react';
import { motion } from 'framer-motion';
import { MapToken } from '@/hooks/useBattleMap';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';

interface Props {
  token: MapToken;
  isDM: boolean;
  canMove: boolean;
  gridSize: number;
  snapToGrid: boolean;
  onMove: (x: number, y: number) => void;
  onRemove: () => void;
}

export function Token({ token, isDM, canMove, gridSize, snapToGrid, onMove, onRemove }: Props) {
  const handleDragEnd = (_: any, info: any) => {
    let newX = token.x + info.offset.x;
    let newY = token.y + info.offset.y;

    if (snapToGrid) {
      newX = Math.round(newX / gridSize) * gridSize;
      newY = Math.round(newY / gridSize) * gridSize;
    }

    onMove(newX, newY);
  };

  return (
    <motion.div
      drag={canMove}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      className={cn(
        "absolute z-10 cursor-grab active:cursor-grabbing group",
        !token.is_visible && "opacity-50 grayscale"
      )}
      style={{ 
        x: token.x, 
        y: token.y,
        width: token.size,
        height: token.size
      }}
      initial={false}
    >
      <div className="relative w-full h-full rounded-full border-2 border-[var(--gold)] bg-black/40 overflow-hidden shadow-xl group-hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-shadow">
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
      </div>

      {/* DM Controls */}
      {isDM && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  );
}

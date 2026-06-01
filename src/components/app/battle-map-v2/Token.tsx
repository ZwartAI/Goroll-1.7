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
  isDragging?: boolean;
  onMove: (x: number, y: number) => void;
  onRemove: () => void;
  onUpdateSize?: (size: number) => void;
}

export function Token({ 
  token, isDM, canMove, gridSize, snapToGrid, 
  scale = 1, gridOffsetX = 0, gridOffsetY = 0,
  isDragging = false,
  onMove, onRemove, onUpdateSize 
}: Props) {
  return (
    <div
      data-token-id={token.id}
      data-token="true"
      onDragStart={(e) => e.preventDefault()}
      className={cn(
        "absolute z-10 cursor-grab active:cursor-grabbing group pointer-events-auto select-none",
        !token.is_visible && "opacity-50 grayscale",
        isDragging && "cursor-grabbing z-50"
      )}
      style={{ 
        width: token.size,
        height: token.size,
        left: 0,
        top: 0,
        transform: `translate3d(${token.x}px, ${token.y}px, 0)`,
        transition: isDragging ? 'none' : 'transform 0.15s ease-out',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none'
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
      </div>

      {/* Control Buttons (Only trash as requested) */}
      {(isDM || canMove) && (
        <div className="absolute -top-3 -right-3 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-[60]">
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-red-600 transition-colors hover:scale-110 active:scale-95"
            title="Eliminar token"
            data-map-ui="true"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

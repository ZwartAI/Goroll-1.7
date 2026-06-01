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
  onMove: (x: number, y: number, isFinal?: boolean) => void;
  onRemove: () => void;
  onUpdateSize?: (size: number) => void;
  screenToWorld: (x: number, y: number) => { x: number, y: number };
}

export function Token({ 
  token, isDM, canMove, gridSize, snapToGrid, 
  scale = 1, gridOffsetX = 0, gridOffsetY = 0,
  isDragging: isDraggingProp = false,
  onMove, onRemove, onUpdateSize,
  screenToWorld,
  onDragStart,
  onDragEnd
}: Props & { onDragStart?: (id: string) => void, onDragEnd?: () => void }) {

  const [localDragging, setLocalDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [visualPos, setVisualPos] = useState({ x: token.x, y: token.y });

  // Keep visual position in sync with token prop when not dragging
  useEffect(() => {
    if (!localDragging) {
      setVisualPos({ x: token.x, y: token.y });
    }
  }, [token.x, token.y, localDragging]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!canMove) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    
    // Check if clicking UI elements (like trash)
    if ((e.target as HTMLElement).closest('[data-map-ui="true"]')) return;

    e.preventDefault();
    e.stopPropagation();

    const worldCoords = screenToWorld(e.clientX, e.clientY);
    setDragOffset({
      x: worldCoords.x - token.x,
      y: worldCoords.y - token.y
    });
    setLocalDragging(true);
    setVisualPos({ x: token.x, y: token.y });
    onDragStart?.(token.id);
    
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!localDragging) return;
    
    e.preventDefault();
    e.stopPropagation();

    const worldCoords = screenToWorld(e.clientX, e.clientY);
    const newX = worldCoords.x - dragOffset.x;
    const newY = worldCoords.y - dragOffset.y;
    
    setVisualPos({ x: newX, y: newY });
    // Intermediate update for other players (realtime)
    onMove(newX, newY, false);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!localDragging) return;

    e.preventDefault();
    e.stopPropagation();

    let finalX = visualPos.x;
    let finalY = visualPos.y;

    if (snapToGrid) {
      const gx = gridOffsetX || 0;
      const gy = gridOffsetY || 0;
      
      // Calculate the center of the token
      const centerX = finalX + token.size / 2;
      const centerY = finalY + token.size / 2;

      // Find the center of the closest grid cell
      const cellX = Math.round((centerX - gx - gridSize / 2) / gridSize);
      const cellY = Math.round((centerY - gy - gridSize / 2) / gridSize);
      
      const snappedCenterX = cellX * gridSize + gx + gridSize / 2;
      const snappedCenterY = cellY * gridSize + gy + gridSize / 2;

      // Offset back to top-left
      finalX = snappedCenterX - token.size / 2;
      finalY = snappedCenterY - token.size / 2;
    }

    setLocalDragging(false);
    onMove(finalX, finalY, true);
    onDragEnd?.();

    
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  return (
    <div
      data-token-id={token.id}
      data-token="true"
      draggable="false"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDragStart={(e) => e.preventDefault()}
      className={cn(
        "absolute z-10 cursor-grab active:cursor-grabbing group pointer-events-auto select-none",
        !token.is_visible && "opacity-50 grayscale",
        (localDragging || isDraggingProp) && "cursor-grabbing z-50"
      )}
      style={{ 
        width: token.size,
        height: token.size,
        left: 0,
        top: 0,
        transform: `translate3d(${visualPos.x}px, ${visualPos.y}px, 0)`,
        transition: localDragging ? 'none' : 'transform 0.15s ease-out',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        KhtmlUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        touchAction: 'none'
      }}
    >
      <div className="relative w-full h-full rounded-full border-2 border-[var(--gold)] bg-black/60 overflow-hidden shadow-xl group-hover:shadow-[0_0_20px_rgba(234,179,8,0.4)] transition-all pointer-events-none" draggable="false">
        {token.image_url ? (
          <img 
            src={token.image_url} 
            alt={token.name || 'Token'} 
            draggable="false"
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

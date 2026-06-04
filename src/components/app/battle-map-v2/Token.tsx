import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { MapToken } from '@/hooks/useBattleMap';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import { throttle } from 'lodash';

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
  activeTool?: string;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onMove: (x: number, y: number, isFinal?: boolean) => void;
  onRemove: () => void;
  onUpdateSize?: (size: number) => void;
  screenToWorld: (x: number, y: number) => { x: number, y: number };
  className?: string;
}

export const Token = memo(function Token({ 
  token, isDM, canMove, gridSize, snapToGrid, 
  scale = 1, gridOffsetX = 0, gridOffsetY = 0,
  isDragging: isDraggingProp = false,
  activeTool,
  isSelected = false,
  onToggleSelect,
  onMove, onRemove, onUpdateSize,
  screenToWorld,
  onDragStart,
  onDragEnd,
  className
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
    if (activeTool === 'measure') return; // Let it bubble to Stage for ruler logic
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

  // Throttle the intermediate move updates to improve performance
  const throttledOnMove = useCallback(
    throttle((x: number, y: number) => {
      onMove(x, y, false);
    }, 50),
    [onMove]
  );

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!localDragging) return;
    
    e.preventDefault();
    e.stopPropagation();

    const worldCoords = screenToWorld(e.clientX, e.clientY);
    const newX = worldCoords.x - dragOffset.x;
    const newY = worldCoords.y - dragOffset.y;
    
    setVisualPos({ x: newX, y: newY });
    // Intermediate update for other players (realtime)
    throttledOnMove(newX, newY);
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
      const centerX = finalX + gridSize / 2;
      const centerY = finalY + gridSize / 2;

      // Find the center of the closest grid cell
      const cellX = Math.round((centerX - gx - gridSize / 2) / gridSize);
      const cellY = Math.round((centerY - gy - gridSize / 2) / gridSize);
      
      const snappedCenterX = cellX * gridSize + gx + gridSize / 2;
      const snappedCenterY = cellY * gridSize + gy + gridSize / 2;

      // Offset back to top-left
      finalX = snappedCenterX - gridSize / 2;
      finalY = snappedCenterY - gridSize / 2;
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
        (localDragging || isDraggingProp) && "cursor-grabbing z-50",
        className
      )}
      style={{ 
        width: gridSize,
        height: gridSize,
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
      <div 
        className={cn(
          "relative w-full h-full rounded-full border-2 bg-black/60 overflow-hidden shadow-xl transition-all pointer-events-none",
          token.token_type === 'enemy' ? "border-[#ef4444] group-hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]" :
          token.token_type === 'npc' ? "border-[#ffffff] group-hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]" :
          "border-[var(--token-color,var(--gold))] group-hover:shadow-[0_0_20px_var(--token-color-glow,rgba(234,179,8,0.4))]"
        )}
        style={{ 
          '--token-color': token.color || 'var(--gold)',
          '--token-color-glow': token.color ? `${token.color}66` : 'rgba(234,179,8,0.4)'
        } as React.CSSProperties}
        draggable="false"
      >
        {token.image_url ? (
          <img 
            src={token.image_url} 
            alt={token.name || 'Token'} 
            draggable="false"
            className="w-full h-full object-cover select-none pointer-events-none"
            style={{ 
              transform: `translate(${(token.image_offset_x ?? 50) - 50}%, ${(token.image_offset_y ?? 50) - 50}%) scale(${token.image_scale || 1})`,
              transformOrigin: 'center center'
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl select-none">
            {token.token_type === 'player' ? '🧙' : '👿'}
          </div>
        )}

        {/* Name Label */}
        {token.name && (
          <div className={cn(
            "absolute bottom-0 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/80 text-[9px] font-bold uppercase tracking-tighter text-white whitespace-nowrap rounded-t border-t border-x pointer-events-none",
            token.token_type === 'enemy' ? "border-[#ef4444]/30" :
            token.token_type === 'npc' ? "border-[#ffffff]/30" :
            "border-[var(--token-color,var(--gold))]/30"
          )}>
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
});

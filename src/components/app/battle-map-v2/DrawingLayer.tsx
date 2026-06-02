import React, { useRef, useState, useMemo, memo } from 'react';
import { Drawing } from '@/hooks/useBattleMap';
import { cn } from '@/lib/utils';
import { MapTool } from './Toolbar';

interface Props {
  drawings: Drawing[];
  onAddDrawing: (drawing: Omit<Drawing, 'id' | 'campaign_id' | 'scene_id'>) => void;
  onRemoveDrawing: (id: string) => void;
  activeTool: MapTool;
  gridSize: number;
  characterId?: string;
  authorName?: string;
  authorColor?: string;
  scale: number;
  offset: { x: number, y: number };
}

const MemoizedPolyline = memo(({ drawing, activeTool, onRemoveDrawing }: { 
  drawing: Drawing, 
  activeTool: MapTool, 
  onRemoveDrawing: (id: string) => void 
}) => {
  const pointsStr = useMemo(() => drawing.points.join(','), [drawing.points]);
  
  return (
    <polyline
      points={pointsStr}
      fill="none"
      stroke={drawing.color || '#FFD700'}
      strokeWidth={activeTool === 'eraser' ? 20 : (drawing.stroke_width || 3)}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "transition-all duration-200",
        activeTool === 'eraser' ? "cursor-pointer hover:stroke-red-500/50 hover:opacity-80 pointer-events-auto" : "pointer-events-none"
      )}
      onClick={(e) => {
        if (activeTool === 'eraser') {
          e.stopPropagation();
          onRemoveDrawing(drawing.id);
        }
      }}
    />
  );
});

export function DrawingLayer({ drawings, onAddDrawing, onRemoveDrawing, activeTool, gridSize, characterId, authorName, authorColor, scale, offset }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [currentPoints, setCurrentPoints] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const getLocalCoords = (e: React.PointerEvent | React.MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (activeTool !== 'pencil' || !svgRef.current) return;
    setIsDrawing(true);
    const coords = getLocalCoords(e);
    setCurrentPoints([coords.x, coords.y]);
    // Prevent dragging the map while drawing
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activeTool !== 'pencil' || !isDrawing || !svgRef.current) return;
    const coords = getLocalCoords(e);
    // Optimization: only add if distance is significant
    const lastX = currentPoints[currentPoints.length - 2];
    const lastY = currentPoints[currentPoints.length - 1];
    const dist = Math.sqrt(Math.pow(coords.x - lastX, 2) + Math.pow(coords.y - lastY, 2));
    if (dist > 1.5) {
      setCurrentPoints(prev => [...prev, coords.x, coords.y]);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeTool !== 'pencil' || !isDrawing) return;
    setIsDrawing(false);
    if (currentPoints.length > 2) {
      onAddDrawing({
        author_character_id: characterId || null,
        author_name: authorName,
        author_color: authorColor,
        color: authorColor || '#FFD700',
        stroke_width: 3,
        points: currentPoints
      });
    }
    setCurrentPoints([]);
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  return (
    <svg
      ref={svgRef}
      className={cn(
        "absolute inset-0 w-full h-full transition-colors duration-300",
        activeTool === 'pencil' ? "pointer-events-auto cursor-crosshair bg-white/5" : 
        activeTool === 'eraser' ? "pointer-events-auto cursor-pointer bg-red-500/5" : 
        "pointer-events-none"
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Existing Drawings */}
      {drawings.map((drawing) => (
        <MemoizedPolyline 
          key={drawing.id} 
          drawing={drawing} 
          activeTool={activeTool} 
          onRemoveDrawing={onRemoveDrawing} 
        />
      ))}

      {/* Current Active Drawing */}
      {isDrawing && (
        <polyline
          points={currentPoints.join(',')}
          fill="none"
          stroke={authorColor || "#FFD700"}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

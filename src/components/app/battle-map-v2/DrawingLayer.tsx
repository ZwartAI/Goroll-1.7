import React, { useRef, useState } from 'react';
import { Drawing } from '@/hooks/useBattleMap';

interface Props {
  drawings: Drawing[];
  onAddDrawing: (drawing: Omit<Drawing, 'id' | 'campaign_id' | 'scene_id'>) => void;
  active: boolean;
  gridSize: number;
  characterId?: string;
}

export function DrawingLayer({ drawings, onAddDrawing, active, gridSize, characterId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [currentPoints, setCurrentPoints] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!active || !svgRef.current) return;
    setIsDrawing(true);
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentPoints([x, y]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!active || !isDrawing || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentPoints(prev => [...prev, x, y]);
  };

  const handleMouseUp = () => {
    if (!active || !isDrawing) return;
    setIsDrawing(false);
    if (currentPoints.length > 2) {
      onAddDrawing({
        author_character_id: characterId || null,
        color: '#FFD700',
        stroke_width: 3,
        points: currentPoints
      });
    }
    setCurrentPoints([]);
  };

  return (
    <svg
      ref={svgRef}
      className={cn(
        "absolute inset-0 w-full h-full",
        active ? "pointer-events-auto cursor-crosshair" : "pointer-events-none"
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Existing Drawings */}
      {drawings.map((drawing) => (
        <polyline
          key={drawing.id}
          points={drawing.points.join(',')}
          fill="none"
          stroke={drawing.color || '#FFD700'}
          strokeWidth={drawing.stroke_width || 3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {/* Current Active Drawing */}
      {isDrawing && (
        <polyline
          points={currentPoints.join(',')}
          fill="none"
          stroke="#FFD700"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

// Utility to handle className
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

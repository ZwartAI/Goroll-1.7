import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Line } from 'react-konva';
import Konva from 'konva';
import { MapToken } from './MapToken';
import type { CombatParticipant } from '@/lib/combat';

// FASE 1: Estructura base de Konva Stage
// Optimizado para rendimiento con capas separadas y memoización.

interface Props {
  width: number;
  height: number;
  participants: CombatParticipant[];
}

export const BattleMapStage: React.FC<Props> = React.memo(({ width, height, participants }) => {
  const stageRef = useRef<Konva.Stage>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // PREPARADO PARA FASE 2: Sistema de Grid
  const gridSize = 50;
  
  // Handlers para Touch (Pinch-to-zoom y Drag fluido)
  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const speed = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * speed : oldScale / speed;

    stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);
    
    setScale(newScale);
    setPosition(newPos);
  };

  // Renderizado optimizado de la Grid (FASE 1)
  const gridLines = useMemo(() => {
    const lines = [];
    // Dibujamos un área grande para permitir scroll
    const size = 5000;
    for (let i = 0; i <= size / gridSize; i++) {
      lines.push(
        <Line
          key={`v-${i}`}
          points={[i * gridSize, 0, i * gridSize, size]}
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={1}
        />
      );
      lines.push(
        <Line
          key={`h-${i}`}
          points={[0, i * gridSize, size, i * gridSize]}
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={1}
        />
      );
    }
    return lines;
  }, [gridSize]);

  return (
    <div className="w-full h-full bg-[#0a0a0c] relative overflow-hidden">
      {/* Texto temporal FASE 1 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <p className="text-[var(--gold)]/20 font-display text-2xl uppercase tracking-[0.2em] select-none">
          Mapa de Batalla - Área interactiva
        </p>
      </div>

      <Stage
        width={width}
        height={height}
        ref={stageRef}
        onWheel={handleWheel}
        draggable
        onDragEnd={(e) => setPosition(e.target.position())}
        className="cursor-grab active:cursor-grabbing"
      >
        {/* Capa de Fondo y Grid (Estática mayormente) */}
        <Layer listening={false}>
          <Rect
            x={-2500}
            y={-2500}
            width={5000}
            height={5000}
            fill="#0f0f12"
          />
          {gridLines}
        </Layer>

        {/* PREPARADO PARA FASE 2: Capa de Tokens */}
        <Layer id="tokens-layer">
          {participants.map((p, i) => (
            <MapToken 
              key={p.id} 
              participant={p} 
              x={width / 2 + (i % 3) * 60 - 60} 
              y={height / 2 + Math.floor(i / 3) * 60 - 60} 
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
});

BattleMapStage.displayName = 'BattleMapStage';

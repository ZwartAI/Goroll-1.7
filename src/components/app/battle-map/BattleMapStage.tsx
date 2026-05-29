import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Line, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { MapToken } from './MapToken';
import type { CombatParticipant } from '@/lib/combat';
import type { MapConfig } from './BattleMap';
import useImage from 'use-image';

// FASE 2: Background + Grid configurable + Snap
// Optimizado para rendimiento con capas separadas y memoización.

interface Props {
  width: number;
  height: number;
  participants: CombatParticipant[];
  config: MapConfig;
}

export const BattleMapStage: React.FC<Props> = React.memo(({ width, height, participants, config }) => {
  const stageRef = useRef<Konva.Stage>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [bgImage] = useImage(config.backgroundType === 'image' ? config.backgroundUrl : '');
  const [_, setVideoTick] = useState(0);

  // Sistema de Grid
  const gridSize = config.gridSize;
  
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

  // Setup Video Background
  useEffect(() => {
    if (config.backgroundType === 'video' && config.backgroundUrl) {
      const video = document.createElement('video');
      video.src = config.backgroundUrl;
      video.loop = true;
      video.muted = true;
      video.autoplay = true;
      video.play();
      
      video.onplaying = () => {
        const anim = new Konva.Animation(() => {
          // Force re-render of the video frame
          setVideoTick(prev => prev + 1);
        }, layerRef.current);
        anim.start();
        return () => anim.stop();
      };
      
      videoRef.current = video;
      return () => {
        video.pause();
        videoRef.current.src = "";
        video.load();
      };
    }
  }, [config.backgroundUrl, config.backgroundType]);

  // Renderizado optimizado de la Grid
  const gridLines = useMemo(() => {
    if (!config.showGrid) return null;
    const lines = [];
    const size = 5000;
    for (let i = 0; i <= size / gridSize; i++) {
      lines.push(
        <Line
          key={`v-${i}`}
          points={[i * gridSize, 0, i * gridSize, size]}
          stroke={config.gridColor}
          strokeWidth={1}
          opacity={config.gridOpacity}
        />
      );
      lines.push(
        <Line
          key={`h-${i}`}
          points={[0, i * gridSize, size, i * gridSize]}
          stroke={config.gridColor}
          strokeWidth={1}
          opacity={config.gridOpacity}
        />
      );
    }
    return lines;
  }, [gridSize, config.gridColor, config.gridOpacity, config.showGrid]);

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
        {/* Capa de Fondo (Video o Imagen) */}
        <Layer ref={layerRef}>
          <Rect
            x={-2500}
            y={-2500}
            width={5000}
            height={5000}
            fill="#0f0f12"
          />
          {config.backgroundUrl && (config.backgroundType === 'video' ? (
            <KonvaImage
              image={videoRef.current!}
              x={0}
              y={0}
              width={gridSize * 20 * config.backgroundScale}
              height={gridSize * 20 * config.backgroundScale}
              opacity={config.backgroundOpacity}
              filters={[Konva.Filters.Brighten]}
              brightness={config.backgroundBrightness - 1}
            />
          ) : bgImage && (
            <KonvaImage
              image={bgImage}
              x={0}
              y={0}
              width={bgImage.width * config.backgroundScale}
              height={bgImage.height * config.backgroundScale}
              opacity={config.backgroundOpacity}
              filters={[Konva.Filters.Brighten]}
              brightness={config.backgroundBrightness - 1}
            />
          ))}
        </Layer>

        {/* Capa de Grid */}
        <Layer listening={false}>
          {gridLines}
        </Layer>

        {/* PREPARADO PARA FASE 2: Capa de Tokens */}
        <Layer id="tokens-layer">
          {participants.map((p, i) => (
            <MapToken 
              key={p.id} 
              participant={p} 
              x={width / 2 + (i % 3) * gridSize - gridSize} 
              y={height / 2 + Math.floor(i / 3) * gridSize - gridSize}
              gridSize={gridSize}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
});

BattleMapStage.displayName = 'BattleMapStage';

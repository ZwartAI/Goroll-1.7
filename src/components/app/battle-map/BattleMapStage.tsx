import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Line, Circle as KonvaCircle, Image as KonvaImage, Group, Text, Wedge } from 'react-konva';
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
  onLongPressToken?: (id: string, x: number, y: number) => void;
}

export type ProjectionType = 'distance' | 'area' | 'line' | 'cone';

export interface ProjectionState {
  type: ProjectionType;
  origin: { x: number; y: number };
  current: { x: number; y: number };
}

export const BattleMapStage: React.FC<Props> = React.memo(({ width, height, participants, config, onLongPressToken }) => {
  const stageRef = useRef<Konva.Stage>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [bgImage] = useImage(config.backgroundType === 'image' ? config.backgroundUrl : '');
  const [_, setVideoTick] = useState(0);
  const [projection, setProjection] = useState<ProjectionState | null>(null);

  // Sistema de Grid
  const gridSize = config.gridSize;

  // FASE 3: Sistema de Proyecciones
  const startProjection = useCallback((type: ProjectionType, origin: { x: number; y: number }) => {
    setProjection({ type, origin, current: origin });
  }, []);

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!projection) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Transform stage pointer to layer coordinates
    const layer = layerRef.current;
    if (!layer) return;
    const transform = layer.getAbsoluteTransform().copy().invert();
    const current = transform.point(pointer);

    setProjection(prev => prev ? { ...prev, current } : null);
  }, [projection]);

  const handleStageMouseUp = useCallback(() => {
    setProjection(null);
  }, []);

  // Exposed for the parent component to trigger via ref if needed, 
  // or via parent's state management. For Phase 3 we'll use local state if possible.
  useEffect(() => {
    // Add global mouseup to ensure projection ends even if released outside stage
    window.addEventListener('mouseup', handleStageMouseUp);
    window.addEventListener('touchend', handleStageMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleStageMouseUp);
      window.removeEventListener('touchend', handleStageMouseUp);
    };
  }, [handleStageMouseUp]);

  // Calculations for projection visuals
  const projectionVisuals = useMemo(() => {
    if (!projection) return null;
    const { type, origin, current } = projection;
    const dx = current.x - origin.x;
    const dy = current.y - origin.y;
    const distPx = Math.sqrt(dx * dx + dy * dy);
    const distFeet = Math.floor(distPx / gridSize) * 5;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    const commonProps = {
      stroke: 'rgba(234, 179, 8, 0.6)',
      strokeWidth: 2,
      fill: 'rgba(234, 179, 8, 0.1)',
      shadowBlur: 10,
      shadowColor: 'rgba(234, 179, 8, 0.5)',
    };

    const label = (
      <Group x={(origin.x + current.x) / 2} y={(origin.y + current.y) / 2 - 20}>
        <Rect
          width={60}
          height={20}
          fill="rgba(0,0,0,0.8)"
          cornerRadius={4}
          offsetX={30}
          offsetY={10}
        />
        <Text
          text={`${distFeet} ft`}
          fill="var(--gold)"
          fontSize={10}
          fontFamily="monospace"
          width={60}
          align="center"
          offsetX={30}
          offsetY={5}
        />
      </Group>
    );

    switch (type) {
      case 'distance':
        return (
          <Group>
            <Line
              points={[origin.x, origin.y, current.x, current.y]}
              {...commonProps}
              dash={[10, 5]}
            />
            <KonvaCircle x={current.x} y={current.y} radius={5} fill="var(--gold)" />
            {label}
          </Group>
        );
      case 'area':
        return (
          <Group>
            <KonvaCircle x={origin.x} y={origin.y} radius={distPx} {...commonProps} />
            <Text
              x={origin.x}
              y={origin.y - distPx - 20}
              text={`${distFeet} ft radius`}
              fill="var(--gold)"
              fontSize={10}
              align="center"
              offsetX={30}
            />
          </Group>
        );
      case 'line':
        return (
          <Group>
            <Line
              points={[origin.x, origin.y, current.x, current.y]}
              {...commonProps}
              strokeWidth={gridSize}
              lineCap="round"
              opacity={0.3}
            />
            <Line
              points={[origin.x, origin.y, current.x, current.y]}
              {...commonProps}
            />
            {label}
          </Group>
        );
      case 'cone':
        return (
          <Group>
            <Wedge
              x={origin.x}
              y={origin.y}
              radius={distPx}
              angle={60}
              rotation={angle - 30}
              {...commonProps}
            />
            <Text
              x={current.x}
              y={current.y - 20}
              text={`${distFeet} ft cone`}
              fill="var(--gold)"
              fontSize={10}
              offsetX={30}
            />
          </Group>
        );
      default:
        return null;
    }
  }, [projection, gridSize]);

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
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.src = "";
          videoRef.current.load();
        }
      };
    }
  }, [config.backgroundUrl, config.backgroundType]);

  // FASE 3: Event listener for start-projection
  useEffect(() => {
    const handleStartProjection = (e: any) => {
      const { type, tokenId } = e.detail;
      // Find token pos
      // Since we don't store token pos in parent yet (they are draggable local state in MapToken),
      // we'll find the participant and use its initial pos for now, 
      // but ideally we should track current pos.
      // For this phase, we'll assume origin is the center of the grid cell
      const part = participants.find(p => p.id === tokenId);
      if (part) {
        // Simple logic: we need the actual visual position.
        // For Phase 3, we use the stage reference to find the node.
        const stage = stageRef.current;
        if (stage) {
          const tokenNode = stage.findOne((node: any) => node.attrs.participantId === tokenId || (node.parent && node.parent.attrs.participantId === tokenId));
          const origin = tokenNode ? { x: tokenNode.x(), y: tokenNode.y() } : { x: width/2, y: height/2 };
          startProjection(type, origin);
        }
      }
    };
    window.addEventListener('start-projection', handleStartProjection);
    return () => window.removeEventListener('start-projection', handleStartProjection);
  }, [participants, startProjection, width, height]);

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
        onMouseMove={handleStageMouseMove}
        onTouchMove={handleStageMouseMove}
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
              onLongPress={(px, py) => onLongPressToken?.(p.id, px, py)}
              onProjectionStart={(type, origin) => startProjection(type, origin)}
            />
          ))}
        </Layer>

        {/* FASE 3: Capa de Proyecciones Temporales */}
        <Layer id="projections-layer" listening={false}>
          {projectionVisuals}
        </Layer>
      </Stage>
    </div>
  );
});

BattleMapStage.displayName = 'BattleMapStage';

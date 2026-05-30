import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Line, Circle as KonvaCircle, Image as KonvaImage, Group, Text, Wedge } from 'react-konva';
import Konva from 'konva';
import { MapToken } from './MapToken';
import type { CombatParticipant } from '@/lib/combat';
import type { MapConfig } from './BattleMap';
import { BattleMapChalkLayer, type ChalkLine, type ChalkNote } from './BattleMapChalkLayer';
import { type ChalkTool, type ChalkColor, type ChalkSize } from './BattleMapChalkControls';
import useImage from 'use-image';

// FASE 2: Background + Grid configurable + Snap
// FASE 3: Projections
// FASE 4: Chalk
// FASE 5: Scenes + Realtime Sync

interface Props {
  width: number;
  height: number;
  participants: CombatParticipant[];
  config: MapConfig;
  onLongPressToken?: (id: string, x: number, y: number) => void;
  // FASE 4 Props
  isChalkMode?: boolean;
  chalkTool?: ChalkTool;
  chalkColor?: ChalkColor;
  chalkSize?: ChalkSize;
  chalkLines: ChalkLine[];
  chalkNotes: ChalkNote[];
  onAddChalkLine?: (line: ChalkLine) => void;
  onAddNote?: (x: number, y: number) => void;
  onNoteUpdate?: (id: string, x: number, y: number) => void;
  onNoteClick?: (id: string) => void;
  // FASE 5 Props
  remoteTokenPositions?: Record<string, { x: number; y: number }>;
  remoteProjections?: Record<string, ProjectionState | null>;
  onTokenMove?: (id: string, x: number, y: number) => void;
  onTokenMoveEnd?: () => void;
  onProjectionUpdate?: (projection: ProjectionState | null) => void;
  role: string;
  currentUserId?: string;
}

export type ProjectionType = 'distance' | 'area' | 'line' | 'cone';

export interface ProjectionState {
  type: ProjectionType;
  origin: { x: number; y: number };
  current: { x: number; y: number };
}

export const BattleMapStage: React.FC<Props> = React.memo(({ 
  width, 
  height, 
  participants, 
  config, 
  onLongPressToken,
  isChalkMode = false,
  chalkTool = 'pencil',
  chalkColor = '#ffffff',
  chalkSize = 5,
  chalkLines,
  chalkNotes,
  onAddChalkLine,
  onAddNote,
  onNoteUpdate,
  onNoteClick,
  remoteTokenPositions = {},
  remoteProjections = {},
  onTokenMove,
  onTokenMoveEnd,
  onProjectionUpdate,
  role,
  currentUserId
}) => {
  const stageRef = useRef<Konva.Stage>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [bgImage] = useImage(config.backgroundType === 'image' ? config.backgroundUrl : '');
  const [_, setVideoTick] = useState(0);
  const [projection, setProjection] = useState<ProjectionState | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLinePoints, setCurrentLinePoints] = useState<number[]>([]);

  const gridSize = config.gridSize;

  const renderProjection = useCallback((proj: ProjectionState, colorScale: string = 'var(--gold)') => {
    const { type, origin, current } = proj;
    const dx = current.x - origin.x;
    const dy = current.y - origin.y;
    const distPx = Math.sqrt(dx * dx + dy * dy);
    const distFeet = Math.floor(distPx / gridSize) * 5;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    const commonProps = {
      stroke: colorScale.includes('var') ? 'rgba(234, 179, 8, 0.6)' : colorScale,
      strokeWidth: 2,
      fill: colorScale.includes('var') ? 'rgba(234, 179, 8, 0.1)' : colorScale + '22',
      shadowBlur: 10,
      shadowColor: colorScale.includes('var') ? 'rgba(234, 179, 8, 0.5)' : colorScale,
    };

    const label = (
      <Group x={(origin.x + current.x) / 2} y={(origin.y + current.y) / 2 - 20}>
        <Rect width={60} height={20} fill="rgba(0,0,0,0.8)" cornerRadius={4} offsetX={30} offsetY={10} />
        <Text text={`${distFeet} ft`} fill="var(--gold)" fontSize={10} fontFamily="monospace" width={60} align="center" offsetX={30} offsetY={5} />
      </Group>
    );

    switch (type) {
      case 'distance':
        return (
          <Group key={JSON.stringify(origin)}>
            <Line points={[origin.x, origin.y, current.x, current.y]} {...commonProps} dash={[10, 5]} />
            <KonvaCircle x={current.x} y={current.y} radius={5} fill="var(--gold)" />
            {label}
          </Group>
        );
      case 'area':
        return <KonvaCircle key={JSON.stringify(origin)} x={origin.x} y={origin.y} radius={distPx} {...commonProps} />;
      case 'line':
        return (
          <Group key={JSON.stringify(origin)}>
            <Line points={[origin.x, origin.y, current.x, current.y]} {...commonProps} strokeWidth={gridSize} lineCap="round" opacity={0.3} />
            <Line points={[origin.x, origin.y, current.x, current.y]} {...commonProps} />
            {label}
          </Group>
        );
      case 'cone':
        return <Wedge key={JSON.stringify(origin)} x={origin.x} y={origin.y} radius={distPx} angle={60} rotation={angle - 30} {...commonProps} />;
      default: return null;
    }
  }, [gridSize]);

  const projectionVisuals = useMemo(() => {
    if (!projection) return null;
    return renderProjection(projection);
  }, [projection, renderProjection]);

  const remoteProjectionVisuals = useMemo(() => {
    return Object.entries(remoteProjections).map(([userId, proj]) => {
      if (!proj) return null;
      return renderProjection(proj, 'rgba(100, 149, 237, 0.5)');
    });
  }, [remoteProjections, renderProjection]);

  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isChalkMode) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const layer = layerRef.current;
    if (!layer) return;
    const transform = layer.getAbsoluteTransform().copy().invert();
    const pos = transform.point(pointer);
    if (chalkTool === 'pencil') {
      setIsDrawing(true);
      setCurrentLinePoints([pos.x, pos.y]);
    } else if (chalkTool === 'note') {
      onAddNote?.(pos.x, pos.y);
    }
  }, [isChalkMode, chalkTool, onAddNote]);

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const layer = layerRef.current;
    if (!layer) return;
    const transform = layer.getAbsoluteTransform().copy().invert();
    const pos = transform.point(pointer);
    if (projection) {
      setProjection(prev => {
        const next = prev ? { ...prev, current: pos } : null;
        onProjectionUpdate?.(next);
        return next;
      });
      return;
    }
    if (isDrawing && chalkTool === 'pencil') {
      setCurrentLinePoints(prev => [...prev, pos.x, pos.y]);
    }
  }, [projection, isDrawing, chalkTool, onProjectionUpdate]);

  const handleStageMouseUp = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      if (currentLinePoints.length > 2) {
        onAddChalkLine?.({ points: currentLinePoints, color: chalkColor, size: chalkSize });
      }
      setCurrentLinePoints([]);
    }
    setProjection(null);
    onProjectionUpdate?.(null);
  }, [isDrawing, currentLinePoints, onAddChalkLine, chalkColor, chalkSize, onProjectionUpdate]);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
    const speed = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * speed : oldScale / speed;
    stage.scale({ x: newScale, y: newScale });
    const newPos = { x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale };
    stage.position(newPos);
    setScale(newScale);
    setPosition(newPos);
  };

  useEffect(() => {
    if (config.backgroundType === 'video' && config.backgroundUrl) {
      const video = document.createElement('video');
      video.src = config.backgroundUrl;
      video.loop = true; video.muted = true; video.autoplay = true;
      video.play();
      video.onplaying = () => {
        const anim = new Konva.Animation(() => setVideoTick(prev => prev + 1), layerRef.current);
        anim.start(); return () => anim.stop();
      };
      videoRef.current = video;
      return () => { if (videoRef.current) { videoRef.current.pause(); videoRef.current.src = ""; videoRef.current.load(); } };
    }
  }, [config.backgroundUrl, config.backgroundType]);

  useEffect(() => {
    const handleStartProjection = (e: any) => {
      const { type, tokenId } = e.detail;
      const stage = stageRef.current;
      if (stage) {
        const tokenNode = stage.findOne((node: any) => node.attrs.participantId === tokenId || (node.parent && node.parent.attrs.participantId === tokenId));
        const origin = tokenNode ? { x: tokenNode.x(), y: tokenNode.y() } : { x: width/2, y: height/2 };
        setProjection({ type, origin, current: origin });
      }
    };
    window.addEventListener('start-projection', handleStartProjection);
    return () => window.removeEventListener('start-projection', handleStartProjection);
  }, [width, height]);

  const gridLines = useMemo(() => {
    if (!config.showGrid) return null;
    const lines = [];
    const size = 5000;
    for (let i = 0; i <= size / gridSize; i++) {
      lines.push(<Line key={`v-${i}`} points={[i * gridSize, 0, i * gridSize, size]} stroke={config.gridColor} strokeWidth={1} opacity={config.gridOpacity} />);
      lines.push(<Line key={`h-${i}`} points={[0, i * gridSize, size, i * gridSize]} stroke={config.gridColor} strokeWidth={1} opacity={config.gridOpacity} />);
    }
    return lines;
  }, [gridSize, config.gridColor, config.gridOpacity, config.showGrid]);

  return (
    <div className="w-full h-full bg-[#0a0a0c] relative overflow-hidden">
      <Stage
        width={width} height={height} ref={stageRef} onWheel={handleWheel} draggable={!isChalkMode && !isDrawing}
        onDragEnd={(e) => setPosition(e.target.position())}
        onMouseDown={handleStageMouseDown} onTouchStart={handleStageMouseDown}
        onMouseMove={handleStageMouseMove} onTouchMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp} onTouchEnd={handleStageMouseUp}
        className={isChalkMode ? (chalkTool === 'pencil' ? 'cursor-crosshair' : 'cursor-text') : 'cursor-grab active:cursor-grabbing'}
      >
        <Layer ref={layerRef}>
          <Rect x={-2500} y={-2500} width={5000} height={5000} fill="#0f0f12" />
          {config.backgroundUrl && (config.backgroundType === 'video' ? (
            <KonvaImage image={videoRef.current!} x={0} y={0} width={gridSize * 20 * config.backgroundScale} height={gridSize * 20 * config.backgroundScale} opacity={config.backgroundOpacity} />
          ) : bgImage && (
            <KonvaImage image={bgImage} x={0} y={0} width={bgImage.width * config.backgroundScale} height={bgImage.height * config.backgroundScale} opacity={config.backgroundOpacity} />
          ))}
        </Layer>
        <Layer listening={false}>{gridLines}</Layer>
        <Layer id="tokens-layer">
          {participants.map((p, i) => {
            const remotePos = remoteTokenPositions[p.id];
            const initialX = width / 2 + (i % 3) * gridSize - gridSize;
            const initialY = height / 2 + Math.floor(i / 3) * gridSize - gridSize;
            const isDM = role === 'dm';
            const isOwner = currentUserId && p.character_id === currentUserId;

            return (
              <MapToken 
                key={p.id} participant={p} 
                x={remotePos?.x ?? initialX} y={remotePos?.y ?? initialY}
                gridSize={gridSize}
                onLongPress={(px, py) => onLongPressToken?.(p.id, px, py)}
                draggable={isDM || isOwner}
                onDragMove={(e: any) => onTokenMove?.(p.id, e.target.x(), e.target.y())}
                onDragEnd={onTokenMoveEnd}
              />
            );
          })}
        </Layer>
        <Layer id="chalk-layer">
          <BattleMapChalkLayer lines={chalkLines} notes={chalkNotes} onNoteDragEnd={onNoteUpdate} onNoteClick={onNoteClick} />
        </Layer>
        {isDrawing && currentLinePoints.length > 2 && (
          <Layer listening={false}>
            <Line points={currentLinePoints} stroke={chalkColor} strokeWidth={chalkSize} tension={0.5} lineCap="round" lineJoin="round" shadowBlur={chalkSize * 0.8} shadowColor={chalkColor} opacity={0.8} />
          </Layer>
        )}
        <Layer id="projections-layer" listening={false}>
          {projectionVisuals}
          {remoteProjectionVisuals}
        </Layer>
      </Stage>
    </div>
  );
});

BattleMapStage.displayName = 'BattleMapStage';

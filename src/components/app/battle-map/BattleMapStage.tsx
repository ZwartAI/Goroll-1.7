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
  isRulerActive?: boolean;
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
  currentUserId,
  isRulerActive = false
}) => {

  const stageRef = useRef<Konva.Stage>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageRef = useRef<Konva.Image>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [bgImage, status] = useImage(config.backgroundType === 'image' && config.backgroundUrl ? config.backgroundUrl : '', 'anonymous');
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [_, setVideoTick] = useState(0);
  const [projection, setProjection] = useState<ProjectionState | null>(null);
  const [isReady, setIsReady] = useState(false); 

  // Centrar el mapa inicialmente
  useEffect(() => {
    const stage = stageRef.current;
    if (stage) {
      const newX = width / 2;
      const newY = height / 2;
      stage.position({ x: newX, y: newY });
      setPosition({ x: newX, y: newY });
      // If there is no background, we are ready immediately
      if (!config.backgroundUrl) {
        setIsReady(true);
      }
    }
  }, [width, height]);

  // Re-centrar y ajustar escala cuando se carga imagen o video
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let mapW = 0;
    let mapH = 0;
    let loaded = false;

    if (config.backgroundType === 'image' && status === 'loaded' && bgImage) {
      mapW = bgImage.width;
      mapH = bgImage.height;
      loaded = true;
    } else if (config.backgroundType === 'video' && isVideoReady && videoRef.current) {
      mapW = videoRef.current.videoWidth;
      mapH = videoRef.current.videoHeight;
      loaded = true;
    }

    if (loaded && mapW > 0 && mapH > 0) {
      const stageWidth = width;
      const stageHeight = height;
      
      const mapWidth = mapW * (config.backgroundScale || 1);
      const mapHeight = mapH * (config.backgroundScale || 1);
      
      const newScale = Math.min(Math.max(0.1, stageWidth / mapWidth), Math.max(0.1, stageHeight / mapHeight)) * 0.8;
      const newX = (stageWidth - mapWidth * newScale) / 2;
      const newY = (stageHeight - mapHeight * newScale) / 2;
      
      stage.scale({ x: newScale, y: newScale });
      stage.position({ x: newX, y: newY });
      setScale(newScale);
      setPosition({ x: newX, y: newY });
      setIsReady(true);
      
      if (config.backgroundType === 'image') {
        setTimeout(() => {
          if (imageRef.current) {
            imageRef.current.cache();
          }
        }, 100);
      }
    } else if (status === 'failed' || (!config.backgroundUrl)) {
      // BLOQUE 9: Resetear transform si no hay imagen para asegurar que la grid sea visible
      const stageWidth = width;
      const stageHeight = height;
      const newScale = 1;
      const newX = stageWidth / 2;
      const newY = stageHeight / 2;
      
      stage.scale({ x: newScale, y: newScale });
      stage.position({ x: newX, y: newY });
      setScale(newScale);
      setPosition({ x: newX, y: newY });
      setIsReady(true);
    }
  }, [status, bgImage, isVideoReady, config.backgroundScale, config.backgroundUrl, config.backgroundType, width, height]);


  // FASE 7: Subtle particles
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, size: number}>>([]);
  
  useEffect(() => {
    const initialParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 5000 - 2500,
      y: Math.random() * 5000 - 2500,
      size: Math.random() * 2 + 1
    }));
    setParticles(initialParticles);
  }, []);

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
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const layer = layerRef.current;
    if (!layer) return;
    const transform = layer.getAbsoluteTransform().copy().invert();
    const pos = transform.point(pointer);

    if (isRulerActive) {
      setProjection({ type: 'distance', origin: pos, current: pos });
      onProjectionUpdate?.({ type: 'distance', origin: pos, current: pos });
      return;
    }

    if (!isChalkMode) return;
    if (chalkTool === 'pencil') {
      setIsDrawing(true);
      setCurrentLinePoints([pos.x, pos.y]);
    } else if (chalkTool === 'note') {
      onAddNote?.(pos.x, pos.y);
    }
  }, [isChalkMode, isRulerActive, chalkTool, onAddNote, onProjectionUpdate]);


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
      setIsVideoReady(false);
      const video = document.createElement('video');
      video.src = config.backgroundUrl;
      video.loop = true; 
      video.muted = true; 
      video.autoplay = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      
      video.oncanplay = () => {
        setIsVideoReady(true);
      };

      video.play().catch(e => console.error("Error playing video:", e));
      
      video.onplaying = () => {
        const anim = new Konva.Animation(() => setVideoTick(prev => prev + 1), layerRef.current);
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
    } else {
      setIsVideoReady(false);
      videoRef.current = null;
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

  useEffect(() => {
    const handleCenterBackground = () => {
      const stage = stageRef.current;
      if (!stage) return;

      let mapW = 0;
      let mapH = 0;
      let loaded = false;

      if (config.backgroundType === 'image' && bgImage) {
        mapW = bgImage.width;
        mapH = bgImage.height;
        loaded = true;
      } else if (config.backgroundType === 'video' && videoRef.current) {
        mapW = videoRef.current.videoWidth;
        mapH = videoRef.current.videoHeight;
        loaded = true;
      }

      if (loaded && mapW > 0 && mapH > 0) {
        const bgScale = config.backgroundScale || 1;
        const centerX = (mapW * bgScale) / 2;
        const centerY = (mapH * bgScale) / 2;
        
        const currentScale = stage.scaleX();
        
        // Objetivo: el centro de la imagen (centerX, centerY) debe quedar en (width/2, height/2) del viewport
        const targetX = width / 2 - centerX * currentScale;
        const targetY = height / 2 - centerY * currentScale;

        // Animación suave
        stage.to({
          x: targetX,
          y: targetY,
          duration: 0.5,
          easing: Konva.Easings.EaseInOut,
          onFinish: () => {
            setPosition({ x: targetX, y: targetY });
          }
        });
      }
    };

    window.addEventListener('battle-map:center-background', handleCenterBackground);
    return () => window.removeEventListener('battle-map:center-background', handleCenterBackground);
  }, [bgImage, config.backgroundScale, config.backgroundType, width, height]);

  useEffect(() => {
    const handleFocusPoint = (e: any) => {
      const { x, y, scale: targetScale } = e.detail;
      const stage = stageRef.current;
      if (!stage) return;

      // Calculate target X, Y to center the world point (x, y) in the viewport center (width/2, height/2)
      const currentScale = targetScale || stage.scaleX();
      const targetX = width / 2 - x * currentScale;
      const targetY = height / 2 - y * currentScale;

      // Smooth animation
      stage.to({
        x: targetX,
        y: targetY,
        scaleX: currentScale,
        scaleY: currentScale,
        duration: 1,
        easing: Konva.Easings.EaseInOut,
        onFinish: () => {
          setPosition({ x: targetX, y: targetY });
          setScale(currentScale);
        }
      });
    };

    window.addEventListener('battle-map:focus-point', handleFocusPoint);
    return () => window.removeEventListener('battle-map:focus-point', handleFocusPoint);
  }, [width, height]);

  const gridLines = useMemo(() => {
    if (!config.showGrid) return null;
    const lines = [];
    const size = 20000; 
    const offset = -10000;
    
    const gSize = Math.max(10, gridSize);
    const s = scale || 1;
    // BLOQUE 8: Asegurar que la grid sea visible incluso con escala baja
    const lineThickness = Math.max(1, 1 / s); 
    const gridLinesOpacity = Math.max(0.2, config.gridOpacity || 0.4);
    const gridColor = config.gridColor || 'rgba(255,255,255,0.25)';
    
    for (let i = 0; i <= size / gSize; i++) {
      const x = offset + i * gSize;
      lines.push(<Line key={`v-${i}`} points={[x, offset, x, offset + size]} stroke={gridColor} strokeWidth={lineThickness} opacity={gridLinesOpacity} listening={false} />);
    }
    for (let i = 0; i <= size / gSize; i++) {
      const y = offset + i * gSize;
      lines.push(<Line key={`h-${i}`} points={[offset, y, offset + size, y]} stroke={gridColor} strokeWidth={lineThickness} opacity={gridLinesOpacity} listening={false} />);
    }
    return lines;
  }, [gridSize, config.gridColor, config.gridOpacity, config.showGrid, scale]);


  return (
    <div className="w-full h-full bg-[#0a0a0c] relative overflow-hidden border border-white/5">
      <Stage
        width={width} height={height} ref={stageRef} onWheel={handleWheel} draggable={!isChalkMode && !isDrawing}
        onDragEnd={(e) => setPosition(e.target.position())}
        onMouseDown={handleStageMouseDown} onTouchStart={handleStageMouseDown}
        onMouseMove={handleStageMouseMove} onTouchMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp} onTouchEnd={handleStageMouseUp}
        className={isChalkMode ? (chalkTool === 'pencil' ? 'cursor-crosshair' : 'cursor-text') : 'cursor-grab active:cursor-grabbing'}
      >
        <Layer ref={layerRef}>
          {/* Capa de fondo base (siempre presente al fondo) */}
          <Rect x={-10000} y={-10000} width={20000} height={20000} fill="#0a0a0c" listening={false} />
          <Rect x={-5000} y={-5000} width={10000} height={10000} fill="#121214" listening={false} />
          
          
          {config.backgroundUrl && (
            config.backgroundType === 'video' ? (
              <KonvaImage 
                image={videoRef.current!} 
                x={0} y={0} 
                width={videoRef.current && videoRef.current.videoWidth > 0 ? videoRef.current.videoWidth * (config.backgroundScale || 1) : gridSize * 40} 
                height={videoRef.current && videoRef.current.videoHeight > 0 ? videoRef.current.videoHeight * (config.backgroundScale || 1) : gridSize * 40} 
                opacity={config.backgroundOpacity} 
                filters={[Konva.Filters.Brighten]}
                brightness={config.backgroundBrightness - 1}
              />
            ) : bgImage ? (
              <KonvaImage 
                ref={imageRef}
                image={bgImage} 
                x={0} y={0} 
                width={bgImage.width * (config.backgroundScale || 1)} 
                height={bgImage.height * (config.backgroundScale || 1)} 
                opacity={config.backgroundOpacity} 
                filters={[Konva.Filters.Brighten]}
                brightness={config.backgroundBrightness - 1}
              />
            ) : null
          )}

          {/* Grid sobre la imagen para asegurar visibilidad máxima */}
          <Group id="grid-group" listening={false} name="grid-layer">
            {gridLines}
          </Group>
          
          {/* Fallback/Loading indicator visible if image takes time or fails */}
          {config.backgroundUrl && (status === 'loading' || (config.backgroundType === 'video' && !isVideoReady)) && (
            <Group x={(width/2 - position.x)/scale} y={(height/2 - position.y)/scale}>
              <Text 
                text="Cargando mapa..." 
                fill="var(--gold)" 
                fontSize={24 / scale} 
                fontStyle="bold"
                align="center" 
                width={400 / scale} 
                offsetX={200 / scale} 
              />
            </Group>
          )}

          {status === 'failed' && config.backgroundUrl && (
            <Group x={(width/2 - position.x)/scale} y={(height/2 - position.y)/scale}>
              <Text 
                text="⚠️ Error al cargar la imagen del mapa" 
                fill="#ef4444" 
                fontSize={24 / scale} 
                fontStyle="bold"
                align="center" 
                width={600 / scale} 
                offsetX={300 / scale} 
              />
              <Text 
                text={config.backgroundUrl.substring(0, 50) + "..."} 
                fill="#ef4444" 
                fontSize={12 / scale} 
                y={30 / scale}
                align="center" 
                width={600 / scale} 
                offsetX={300 / scale} 
                opacity={0.7}
              />
            </Group>
          )}

          {!config.backgroundUrl && isReady && (
            <Group x={(width/2 - position.x)/scale} y={(height/2 - position.y)/scale}>
              <Text 
                text="Lienzo Vacío - Configura un fondo en Ajustes" 
                fill="rgba(255,255,255,0.2)" 
                fontSize={20 / scale} 
                align="center" 
                width={600 / scale} 
                offsetX={300 / scale} 
              />
            </Group>
          )}

          {/* FASE 7: Floating magical particles */}
          {particles.map(p => (
            <KonvaCircle
              key={p.id}
              x={p.x}
              y={p.y}
              radius={p.size}
              fill="rgba(234, 179, 8, 0.2)"
              shadowBlur={5}
              shadowColor="var(--gold)"
              listening={false}
            />
          ))}
        </Layer>

        <Layer id="tokens-layer">
          {isReady && participants.map((p, i) => {
            const remotePos = remoteTokenPositions[p.id];
            
            // FASE 7: Posicionamiento inicial centrado en viewport real corregido por stage transform
            const initialX = (width / 2 + (i % 3) * gridSize - gridSize - position.x) / scale;
            const initialY = (height / 2 + Math.floor(i / 3) * gridSize - gridSize - position.y) / scale;
            
            const finalX = remotePos?.x ?? initialX;
            const finalY = remotePos?.y ?? initialY;

            const isDM = role === 'dm';
            const isOwner = !!(currentUserId && p.character_id === currentUserId);

            return (
              <MapToken 
                key={p.id} participant={p} 
                x={finalX} y={finalY}
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
          <Layer listening={false} opacity={0.7}>
            <Line 
              points={currentLinePoints} 
              stroke={chalkColor} 
              strokeWidth={chalkSize} 
              tension={0.5} 
              lineCap="round" 
              lineJoin="round" 
              shadowBlur={chalkSize * 0.8} 
              shadowColor={chalkColor} 
            />
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

import React, { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef, useMemo } from 'react';
import { SceneConfig, MapToken, Drawing, isVideoUrl, FogElement } from '@/hooks/useBattleMap';
import { Token } from './Token';
import { DrawingLayer } from './DrawingLayer';
import { FogLayer } from './FogLayer';
import { Stage as KonvaStage, Layer as KonvaLayer, Group, Line as KonvaLine, Circle as KonvaCircle } from 'react-konva';

import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { MapTool, MeasureMode } from './Toolbar';


interface Props {
  battleMap: any;
  isDM: boolean;
  activeTool: MapTool;
  measureMode: MeasureMode;
  measureSnap: boolean;
  characterId?: string;
  authorName?: string;
  authorColor?: string;
  onMeasure?: (distance: number, fromToken?: string, toToken?: string) => void;
  showParticipants?: boolean;
  onMapLoad?: (dims: { width: number, height: number, imgWidth: number, imgHeight: number }) => void;
}

export interface StageHandle {
  centerView: () => void;
  screenToWorld: (clientX: number, clientY: number) => { x: number, y: number };
}

export const Stage = forwardRef<StageHandle, Props>(({ 
  battleMap, isDM, activeTool, measureMode, measureSnap, characterId, authorName, authorColor, onMeasure,
  onMapLoad
}, ref) => {
  const { activeScene, tokens, drawings, fog, updateTokenPosition, updateTokenSize, addDrawing, removeDrawing, addFogElement, isLoading } = battleMap;
  const stageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  
  // Refs to avoid stale closures and for direct DOM updates during interactions
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  
  // Sync refs with state for component-level knowledge
  useEffect(() => {
    scaleRef.current = scale;
    offsetRef.current = offset;
    updateTransform();
  }, [scale, offset]);

  const updateTransform = () => {
    if (containerRef.current) {
      containerRef.current.style.transform = `translate3d(${offsetRef.current.x * scaleRef.current}px, ${offsetRef.current.y * scaleRef.current}px, 0) scale(${scaleRef.current})`;
    }
  };

  const [isPanning, setIsPanning] = useState(false);
  const lastPanPos = useRef({ x: 0, y: 0 });
  const lastMeasureTime = useRef(0);
  const bgMediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);

  // Multi-touch / Gesture state
  const activePointers = useRef(new Map<number, { x: number, y: number }>());
  const lastPinchDist = useRef<number | null>(null);

  // Token dragging state
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);

  // Fog drawing state
  const [isFogging, setIsFogging] = useState(false);
  const [currentFogPoints, setCurrentFogPoints] = useState<number[]>([]);
  const [polygonPoints, setPolygonPoints] = useState<number[]>([]);
  const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);


  // Helper function to convert screen coordinates to world coordinates
  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    if (!stageRef.current) return { x: 0, y: 0 };
    const rect = stageRef.current.getBoundingClientRect();
    
    return {
      x: (clientX - rect.left) / scaleRef.current - offsetRef.current.x,
      y: (clientY - rect.top) / scaleRef.current - offsetRef.current.y
    };
  }, []);

  const zoomAtScreenPoint = useCallback((screenX: number, screenY: number, zoomFactor: number, isFinal: boolean = true) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    
    const localX = screenX - rect.left;
    const localY = screenY - rect.top;

    const oldScale = scaleRef.current;
    const newScale = Math.min(Math.max(oldScale * zoomFactor, 0.25), 5);
    
    if (newScale === oldScale) return;

    // Point in world before zoom
    const worldX = localX / oldScale - offsetRef.current.x;
    const worldY = localY / oldScale - offsetRef.current.y;

    const newOffsetX = localX / newScale - worldX;
    const newOffsetY = localY / newScale - worldY;

    // Update refs immediately
    scaleRef.current = newScale;
    offsetRef.current = { x: newOffsetX, y: newOffsetY };

    // Direct DOM update
    if (containerRef.current) {
      containerRef.current.style.transform = `translate3d(${newOffsetX * newScale}px, ${newOffsetY * newScale}px, 0) scale(${newScale})`;
    }

    if (isFinal) {
      setScale(newScale);
      setOffset({ x: newOffsetX, y: newOffsetY });
    }
  }, []);

  const centerView = useCallback(() => {
    if (!stageRef.current || !activeScene) return;
    const rect = stageRef.current.getBoundingClientRect();
    
    // Find my token
    const myToken = tokens.find((t: MapToken) => t.character_id === characterId);
    
    let targetX = 4000;
    let targetY = 4000;
    
    if (myToken) {
      targetX = myToken.x + (myToken.size / 2);
      targetY = myToken.y + (myToken.size / 2);
    }
    
    const newOffsetX = (rect.width / 2) / scaleRef.current - targetX;
    const newOffsetY = (rect.height / 2) / scaleRef.current - targetY;
    
    setOffset({ x: newOffsetX, y: newOffsetY });
    toast.success(myToken ? 'Centrado en tu ficha' : 'Vista centrada');
  }, [tokens, characterId, activeScene]);

  useImperativeHandle(ref, () => ({
    centerView,
    screenToWorld
  }));

  // Persistence: Save view position
  useEffect(() => {
    if (!activeScene?.id) return;
    const timeout = setTimeout(() => {
      localStorage.setItem(`battlemap_view_${activeScene.id}`, JSON.stringify({ scale, offset }));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [scale, offset, activeScene?.id]);

  // Center the view ONLY on scene change or load
  useEffect(() => {
    if (!stageRef.current || !activeScene?.id) return;
    
    // Check if we have a saved position for this scene
    const saved = localStorage.getItem(`battlemap_view_${activeScene.id}`);
    if (saved) {
      try {
        const { scale: s, offset: o } = JSON.parse(saved);
        setScale(s);
        setOffset(o);
        return;
      } catch (e) {
        console.error("Error loading saved view", e);
      }
    }

    const rect = stageRef.current.getBoundingClientRect();
    setScale(1);
    setOffset({ 
      x: (rect.width / 2) - 4000, 
      y: (rect.height / 2) - 4000
    });
  }, [activeScene?.id]);

  // Prevent default browser behavior on mobile
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 1) {
        e.preventDefault();
      }
    };

    stage.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => stage.removeEventListener('touchmove', handleTouchMove);
  }, []);
  
  // Ruler State
  const [rulerStart, setRulerStart] = useState<{ x: number, y: number } | null>(null);
  const [rulerEnd, setRulerEnd] = useState<{ x: number, y: number } | null>(null);
  const isMeasuring = useRef(false);
  const rulerStartTokenId = useRef<string | null>(null);
  
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    
    const target = e.target as HTMLElement;
    const coords = screenToWorld(e.clientX, e.clientY);

    if (target.closest('[data-map-ui="true"]')) {
      return;
    }

    const tokenElement = target.closest('[data-token-id]');
    const tokenId = tokenElement?.getAttribute('data-token-id');

    if (activePointers.current.size >= 2) {
      setIsPanning(false);
      setDraggingTokenId(null);
      isMeasuring.current = false;

      const pointers = Array.from(activePointers.current.values());
      const dist = Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y);
      lastPinchDist.current = dist;
      return;
    }

    if (activeTool === 'measure') {
      isMeasuring.current = true;
      let startCoords = coords;
      
      if (measureSnap && activeScene && !tokenId) {
        const gridSize = activeScene.grid_size;
        const offsetX = (activeScene.grid_offset_x || 0) + (gridSize / 2);
        const offsetY = (activeScene.grid_offset_y || 0) + (gridSize / 2);
        
        startCoords = {
          x: Math.round((startCoords.x - offsetX) / gridSize) * gridSize + offsetX,
          y: Math.round((startCoords.y - offsetY) / gridSize) * gridSize + offsetY
        };
      }
      
      rulerStartTokenId.current = tokenId || null;

      if (tokenId) {
        const token = tokens.find((t: MapToken) => t.id === tokenId);
        if (token) {
          startCoords = {
            x: token.x + (token.size / 2),
            y: token.y + (token.size / 2)
          };
        }
      }

      setRulerStart(startCoords);
      setRulerEnd(startCoords);
      
      if (stageRef.current) {
        stageRef.current.setPointerCapture(e.pointerId);
      }
    } else if (activeTool.startsWith('fog-')) {
      if (target.closest('[data-map-ui="true"]')) return;
      
      const isPolygon = activeTool === 'fog-polygon' || activeTool === 'fog-polygon-eraser';
      const isEraser = activeTool === 'fog-eraser' || activeTool === 'fog-polygon-eraser';

      if (isEraser) {
        // Try to find a polygon to delete it entirely
        const clickedPolygon = fog.find((f: FogElement) => {
          if (f.type !== 'polygon') return false;
          // Simple hit test for polygon
          let inside = false;
          for (let i = 0, j = f.points.length / 2 - 1; i < f.points.length / 2; j = i++) {
            const xi = f.points[i * 2], yi = f.points[i * 2 + 1];
            const xj = f.points[j * 2], yj = f.points[j * 2 + 1];
            const intersect = ((yi > coords.y) !== (yj > coords.y)) &&
              (coords.x < (xj - xi) * (coords.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
          }
          return inside;
        });

        if (clickedPolygon) {
          battleMap.removeFogElement(clickedPolygon.id);
          return;
        }
      }

      if (isPolygon) {

        const startX = coords.x;
        const startY = coords.y;

        // If clicking near the first point, close the polygon
        if (polygonPoints.length >= 6) { // At least 3 points
          const dist = Math.hypot(startX - polygonPoints[0], startY - polygonPoints[1]);
          if (dist < 20 / scaleRef.current) {
            addFogElement({
              type: 'polygon',
              points: polygonPoints,
              is_eraser: activeTool === 'fog-polygon-eraser'
            });
            setPolygonPoints([]);
            return;
          }
        }
        
        setPolygonPoints(prev => [...prev, startX, startY]);
      } else {
        // Brush or Eraser
        setIsFogging(true);
        setCurrentFogPoints([coords.x, coords.y]);
        if (stageRef.current) {
          stageRef.current.setPointerCapture(e.pointerId);
        }
      }
    } else if (activeTool === 'move') {

      if (tokenId) return;

      if (target.classList.contains('stage-bg') || target.closest('[data-map-background="true"]')) {
        setIsPanning(true);
        lastPanPos.current = { x: e.clientX, y: e.clientY };
        if (stageRef.current) {
          stageRef.current.setPointerCapture(e.pointerId);
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    
    if (activePointers.current.size >= 2 && lastPinchDist.current !== null) {
      const pointers = Array.from(activePointers.current.values());
      const dist = Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y);
      
      const centerX = (pointers[0].x + pointers[1].x) / 2;
      const centerY = (pointers[0].y + pointers[1].y) / 2;
      
      const zoomFactor = dist / lastPinchDist.current;
      zoomAtScreenPoint(centerX, centerY, zoomFactor, false);
      
      lastPinchDist.current = dist;
      return;
    }

    if (isPanning && activePointers.current.size === 1) {
      const dx = (e.clientX - lastPanPos.current.x) / scaleRef.current;
      const dy = (e.clientY - lastPanPos.current.y) / scaleRef.current;
      
      // Update refs for immediate coordinate conversion
      offsetRef.current = { 
        x: offsetRef.current.x + dx, 
        y: offsetRef.current.y + dy 
      };
      
      // Direct DOM update for 60fps performance
      if (containerRef.current) {
        containerRef.current.style.transform = `translate3d(${offsetRef.current.x * scaleRef.current}px, ${offsetRef.current.y * scaleRef.current}px, 0) scale(${scaleRef.current})`;
      }
      
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Ruler logic - throttle this or it's very expensive
    if (activeTool === 'measure' && isMeasuring.current && rulerStart) {
      const coords = screenToWorld(e.clientX, e.clientY);
      let snappedCoords = coords;
      
      if (measureSnap && activeScene) {
        const gridSize = activeScene.grid_size;
        const offsetX = (activeScene.grid_offset_x || 0) + (gridSize / 2);
        const offsetY = (activeScene.grid_offset_y || 0) + (gridSize / 2);
        
        snappedCoords = {
          x: Math.round((coords.x - offsetX) / gridSize) * gridSize + offsetX,
          y: Math.round((coords.y - offsetY) / gridSize) * gridSize + offsetY
        };
      }
      
      // Throttle state update to avoid heavy useMemo re-calc on every frame
      if (Date.now() - lastMeasureTime.current > 32) {
        setRulerEnd(snappedCoords);
        lastMeasureTime.current = Date.now();
      }
    }

    if (activeTool.startsWith('fog-')) {
      const coords = screenToWorld(e.clientX, e.clientY);
      setMousePos(coords);

      if (isFogging && (activeTool === 'fog-brush' || activeTool === 'fog-eraser')) {
        const lastX = currentFogPoints[currentFogPoints.length - 2];
        const lastY = currentFogPoints[currentFogPoints.length - 1];
        const dist = Math.hypot(coords.x - lastX, coords.y - lastY);
        
        if (dist > 5) {
          setCurrentFogPoints(prev => [...prev, coords.x, coords.y]);
        }
      }
    }
  };


  const handlePointerUp = (e: React.PointerEvent) => {
    const wasPinching = activePointers.current.size >= 2;
    activePointers.current.delete(e.pointerId);
    
    if (activePointers.current.size < 2) {
      lastPinchDist.current = null;
    }

    // Sync ref back to state when interaction finishes
    if (isPanning || (wasPinching && activePointers.current.size < 2)) {
      setOffset(offsetRef.current);
      setScale(scaleRef.current);
    }

    if (activeTool === 'measure' && isMeasuring.current) {
      isMeasuring.current = false;
      
      const distance = calculateDistance();
      if (distance > 0) {
        const target = e.target as HTMLElement;
        const endTokenElement = target.closest('[data-token-id]');
        const endTokenId = endTokenElement?.getAttribute('data-token-id') || undefined;
        onMeasure?.(distance, rulerStartTokenId.current || undefined, endTokenId);
      }

      setTimeout(() => {
        if (!isMeasuring.current) {
          setRulerStart(null);
          setRulerEnd(null);
        }
      }, 3000);
    }
    
    if (isFogging) {
      setIsFogging(false);
      if (currentFogPoints.length > 2) {
        addFogElement({
          type: 'brush',
          points: currentFogPoints,
          is_eraser: activeTool === 'fog-eraser'
        });
      }
      setCurrentFogPoints([]);
    }

    setIsPanning(false);

    if (stageRef.current) {
      try {
        stageRef.current.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!(e.target as HTMLElement).closest('.stage-bg')) return;
    e.preventDefault();
    e.stopPropagation();

    const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
    zoomAtScreenPoint(e.clientX, e.clientY, zoomFactor, true);
  };

  // Handle image load to send dimensions
  useEffect(() => {
    if (activeScene?.background_url && onMapLoad) {
      const img = new Image();
      img.onload = () => {
        onMapLoad({
          width: 8000,
          height: 8000,
          imgWidth: img.width,
          imgHeight: img.height
        });
      };
      img.src = activeScene.background_url;
    }
  }, [activeScene?.background_url, onMapLoad]);


  if (!activeScene) {
    return (
      <div className="flex-1 bg-[#111] flex items-center justify-center">
        <div className="text-center p-8 border border-[var(--gold)]/20 rounded-2xl bg-black/40 backdrop-blur-sm max-w-sm">
          <div className="text-4xl mb-4">🗺️</div>
          <h2 className="font-display text-[var(--gold)] text-sm uppercase tracking-widest mb-2">
            Sin Escena Activa
          </h2>
          <p className="text-white/40 text-[10px] uppercase tracking-wider">
            {isDM ? 'Crea una escena en el panel lateral para empezar.' : 'Esperando a que el DM active una escena.'}
          </p>
        </div>
      </div>
    );
  }

  const calculateDistance = () => {
    if (!rulerStart || !rulerEnd) return 0;
    const dx = rulerEnd.x - rulerStart.x;
    const dy = rulerEnd.y - rulerStart.y;
    const pixels = Math.sqrt(dx * dx + dy * dy);
    const cells = pixels / activeScene.grid_size;
    return Math.round(cells * 5); // 5ft per cell
  };

  const highlightedCells = React.useMemo(() => {
    if (!rulerStart || !rulerEnd || !activeScene || !activeScene.grid_enabled) return [];
    
    const gridSize = activeScene.grid_size;
    const dx = rulerEnd.x - rulerStart.x;
    const dy = rulerEnd.y - rulerStart.y;
    const radius = Math.hypot(dx, dy);
    
    // For circle and cone mode, expand radius to distal limit of the tile
    const effectiveRadius = (activeScene.grid_enabled && (measureMode === 'circle' || measureMode === 'cone')) 
      ? radius + (gridSize / 2) 
      : radius;
    
    if (radius < 2) return [];

    const searchRadius = effectiveRadius + gridSize;
    const minX = rulerStart.x - searchRadius;
    const maxX = rulerStart.x + searchRadius;
    const minY = rulerStart.y - searchRadius;
    const maxY = rulerStart.y + searchRadius;
    
    const startCol = Math.floor((minX - (activeScene.grid_offset_x || 0)) / gridSize);
    const endCol = Math.ceil((maxX - (activeScene.grid_offset_x || 0)) / gridSize);
    const startRow = Math.floor((minY - (activeScene.grid_offset_y || 0)) / gridSize);
    const endRow = Math.ceil((maxY - (activeScene.grid_offset_y || 0)) / gridSize);
    
    const cells: {x: number, y: number}[] = [];
    const angle = Math.atan2(dy, dx);
    // Standard D&D 5e cone: width is equal to length.
    // This is roughly 53.13 degrees total (2 * atan(0.5)), so half-spread is atan(0.5)
    const halfSpread = Math.atan(0.5);
    
    const maxSearch = 40;
    const colCount = Math.min(endCol - startCol, maxSearch);
    const rowCount = Math.min(endRow - startRow, maxSearch);
    
    const actualStartCol = Math.max(0, startCol);
    const actualStartRow = Math.max(0, startRow);

    for (let i = 0; i <= colCount; i++) {
      const col = actualStartCol + i;
      for (let j = 0; j <= rowCount; j++) {
        const row = actualStartRow + j;
        const cellX = col * gridSize + (activeScene.grid_offset_x || 0);
        const cellY = row * gridSize + (activeScene.grid_offset_y || 0);
        
        let pointsInside = 0;
        const samples = 4;
        const threshold = 10;
        
        for (let sx = 0; sx < samples; sx++) {
          for (let sy = 0; sy < samples; sy++) {
            const px = cellX + (sx + 0.5) * (gridSize / samples);
            const py = cellY + (sy + 0.5) * (gridSize / samples);
            let inside = false;
            const distToStart = Math.hypot(px - rulerStart.x, py - rulerStart.y);

            if (measureMode === 'circle') {
              inside = distToStart <= effectiveRadius;
            } else if (measureMode === 'cone') {
              if (distToStart <= effectiveRadius) {
                let pAngle = Math.atan2(py - rulerStart.y, px - rulerStart.x);
                let diff = pAngle - angle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                inside = Math.abs(diff) <= halfSpread;
              }
            } else if (measureMode === 'line') {
              const lax = rulerStart.x;
              const lay = rulerStart.y;
              const lbx = rulerEnd.x;
              const lby = rulerEnd.y;
              const L2 = (lbx - lax)**2 + (lby - lay)**2;
              if (L2 < 1) {
                inside = distToStart <= gridSize / 2;
              } else {
                const t = Math.max(0, Math.min(1, ((px - lax) * (lbx - lax) + (py - lay) * (lby - lay)) / L2));
                const projX = lax + t * (lbx - lax);
                const projY = lay + t * (lby - lay);
                const d = Math.hypot(px - projX, py - projY);
                inside = d <= gridSize / 2;
              }
            }
            if (inside) pointsInside++;
          }
          if (pointsInside >= threshold) break;
        }
        if (pointsInside >= threshold) {
          cells.push({ x: cellX, y: cellY });
        }
      }
    }
    return cells;
  }, [rulerStart, rulerEnd, measureMode, activeScene]);

  const isVideo = isVideoUrl;

  return (
    <div 
      className={cn(
        "flex-1 relative overflow-hidden bg-[#050505] touch-none overscroll-none",
        activeTool === 'move' ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"
      )}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
      ref={stageRef}
    >
      <div 
        ref={containerRef}
        className="absolute inset-0 origin-top-left stage-bg"
        data-map-background="true"
        style={{ 
          transform: `translate3d(${offset.x * scale}px, ${offset.y * scale}px, 0) scale(${scale})`,
          width: '8000px',
          height: '8000px',
          willChange: 'transform'
        }}
      >
        {activeScene.background_url && (
          <div 
            className="absolute inset-0 pointer-events-none"
            data-map-background="true"
            style={{ 
              opacity: activeScene.background_opacity,
              zIndex: 0
            }}
          >
            <div 
              style={{ 
                transformOrigin: 'center center',
                transform: `translate(${activeScene.background_x}%, ${activeScene.background_y}%) scale(${activeScene.background_scale})`,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isVideo(activeScene.background_url) ? (
                <video 
                  ref={(el) => { if (el) bgMediaRef.current = el; }}
                  src={activeScene.background_url} 
                  autoPlay loop muted playsInline
                  className="max-w-none max-h-none shadow-2xl"
                  style={{ width: 'auto', height: 'auto' }}
                  onError={() => toast.error('Error al cargar video')}
                />
              ) : (
                <img 
                  ref={(el) => { if (el) bgMediaRef.current = el; }}
                  src={activeScene.background_url} 
                  alt="" 
                  className="max-w-none max-h-none shadow-2xl"
                  style={{ width: 'auto', height: 'auto' }}
                  onError={() => toast.error('Error al cargar imagen')}
                />
              )}
            </div>
          </div>
        )}

        {activeScene.grid_enabled && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{ 
              backgroundImage: `
                linear-gradient(to right, ${activeScene.grid_color} 1px, transparent 1px),
                linear-gradient(to bottom, ${activeScene.grid_color} 1px, transparent 1px)
              `,
              backgroundSize: `${activeScene.grid_size}px ${activeScene.grid_size}px`,
              backgroundPosition: `${activeScene.grid_offset_x}px ${activeScene.grid_offset_y}px`,
              opacity: activeScene.grid_opacity,
              zIndex: 1
            }}
          />
        )}

        {highlightedCells.map((cell, i) => (
          <div 
            key={`${cell.x}-${cell.y}-${i}`}
            className="absolute pointer-events-none"
            style={{ 
              left: cell.x,
              top: cell.y,
              width: activeScene.grid_size,
              height: activeScene.grid_size,
              zIndex: 1.5,
              backgroundColor: `${authorColor || 'var(--gold)'}33`, // 20% opacity in hex (33)
              border: `1px solid ${authorColor || 'var(--gold)'}4D` // 30% opacity in hex (4D)
            }}
          />
        ))}

        <div style={{ zIndex: 2, position: 'absolute', inset: 0 }} className="pointer-events-none">
          <DrawingLayer 
            drawings={drawings} 
            onAddDrawing={addDrawing}
            onRemoveDrawing={removeDrawing}
            activeTool={activeTool}
            gridSize={activeScene.grid_size}
            characterId={characterId}
            authorName={authorName}
            authorColor={authorColor}
            scale={scale}
            offset={offset}
          />
        </div>

        {/* Fog of War Layer */}
        {/* Fog of War Layer & Active Drawing */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 100 }}>
          <KonvaStage width={8000} height={8000}>
            <KonvaLayer listening={false}>
              {/* Permanent Fog Elements */}
              <FogLayer fogElements={fog} opacity={isDM ? 0.4 : 1} />

              {/* Active Brush (while drawing) */}
              {isDM && isFogging && currentFogPoints.length > 2 && (
                <KonvaLine
                  points={currentFogPoints}
                  stroke="black"
                  strokeWidth={80}
                  lineCap="round"
                  lineJoin="round"
                  opacity={0.4}
                  globalCompositeOperation={activeTool === 'fog-eraser' ? 'destination-out' : 'source-over'}
                />
              )}

              {/* Active Polygon (while drawing) */}
              {isDM && polygonPoints.length > 0 && (
                <Group>
                  <KonvaLine
                    points={polygonPoints}
                    stroke="var(--gold)"
                    strokeWidth={2 / scale}
                    dash={[5, 5]}
                  />
                  {/* Line to mouse */}
                  {mousePos && (
                    <KonvaLine
                      points={[
                        polygonPoints[polygonPoints.length - 2], 
                        polygonPoints[polygonPoints.length - 1],
                        mousePos.x,
                        mousePos.y
                      ]}
                      stroke="var(--gold)"
                      strokeWidth={1 / scale}
                      dash={[2, 2]}
                      opacity={0.5}
                    />
                  )}
                  {/* Points visualizer */}
                  {Array.from({ length: polygonPoints.length / 2 }).map((_, i) => (
                    <KonvaCircle
                      key={i}
                      x={polygonPoints[i * 2]}
                      y={polygonPoints[i * 2 + 1]}
                      radius={4 / scale}
                      fill="var(--gold)"
                    />
                  ))}
                </Group>
              )}
            </KonvaLayer>
          </KonvaStage>
        </div>

        <div style={{ zIndex: 10, position: 'absolute', inset: 0 }} className="pointer-events-none">

          {(() => {
            const sortedTokens = (!isDM && characterId) 
              ? [
                  ...tokens.filter((t: MapToken) => t.character_id !== characterId), 
                  ...tokens.filter((t: MapToken) => t.character_id === characterId)
                ]
              : tokens;
              
            return sortedTokens.map((token: MapToken) => (
              <div key={token.id} className="pointer-events-auto">
              <Token 
                token={token} 
                isDM={isDM} 
                canMove={isDM || token.character_id === characterId}
                gridSize={activeScene.grid_size}
                snapToGrid={activeScene.snap_to_grid}
                scale={scale}
                gridOffsetX={activeScene.grid_offset_x}
                gridOffsetY={activeScene.grid_offset_y}
                isDragging={draggingTokenId === token.id}
                activeTool={activeTool}
                onMove={(x: number, y: number, isFinal: boolean = true) => {
                  updateTokenPosition(token.id, x, y, isFinal);
                }}
                onUpdateSize={(size: number) => updateTokenSize(token.id, size)}
                onRemove={() => battleMap.removeToken(token.id)}
                screenToWorld={screenToWorld}
                onDragStart={(id) => setDraggingTokenId(id)}
                onDragEnd={() => setDraggingTokenId(null)}
              />
            </div>
            ))
          })()}
        </div>

        {rulerStart && rulerEnd && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 50 }}>
            {measureMode === 'line' && (
              <>
                <line 
                  x1={rulerStart.x} y1={rulerStart.y} 
                  x2={rulerEnd.x} y2={rulerEnd.y} 
                  stroke={authorColor || "var(--gold)"} strokeWidth={2 / scale} strokeDasharray={`${5 / scale},${5 / scale}`} 
                />
                <circle cx={rulerStart.x} cy={rulerStart.y} r={4 / scale} fill={authorColor || "var(--gold)"} />
                <circle cx={rulerEnd.x} cy={rulerEnd.y} r={4 / scale} fill={authorColor || "var(--gold)"} />
              </>
            )}
            
            {measureMode === 'circle' && (
              <circle 
                cx={rulerStart.x} cy={rulerStart.y} 
                r={Math.hypot(rulerEnd.x - rulerStart.x, rulerEnd.y - rulerStart.y) + (activeScene.grid_enabled ? activeScene.grid_size / 2 : 0)}
                fill={authorColor || "var(--gold)"} fillOpacity={0.1}
                stroke={authorColor || "var(--gold)"} strokeWidth={2 / scale} strokeDasharray={`${5 / scale},${5 / scale}`}
              />
            )}

            {measureMode === 'cone' && (() => {
              const dx = rulerEnd.x - rulerStart.x;
              const dy = rulerEnd.y - rulerStart.y;
              const angle = Math.atan2(dy, dx);
              const radius = Math.hypot(dx, dy);
              const effectiveRadius = activeScene.grid_enabled ? radius + (activeScene.grid_size / 2) : radius;
              
              // Standard D&D 5e cone spread: atan(0.5) is half angle for width = length
              const halfSpread = Math.atan(0.5);
              
              const x1 = rulerStart.x + effectiveRadius * Math.cos(angle - halfSpread);
              const y1 = rulerStart.y + effectiveRadius * Math.sin(angle - halfSpread);
              const x2 = rulerStart.x + effectiveRadius * Math.cos(angle + halfSpread);
              const y2 = rulerStart.y + effectiveRadius * Math.sin(angle + halfSpread);
              
              return (
                <g>
                  <path 
                    d={`M ${rulerStart.x} ${rulerStart.y} L ${x1} ${y1} A ${effectiveRadius} ${effectiveRadius} 0 0 1 ${x2} ${y2} Z`}
                    fill={authorColor || "var(--gold)"} fillOpacity={0.1}
                    stroke={authorColor || "var(--gold)"} strokeWidth={2 / scale} strokeDasharray={`${5 / scale},${5 / scale}`}
                  />
                  <line 
                    x1={rulerStart.x} y1={rulerStart.y} 
                    x2={rulerEnd.x} y2={rulerEnd.y} 
                    stroke={authorColor || "var(--gold)"} strokeWidth={1 / scale} strokeDasharray={`${3 / scale},${3 / scale}`}
                    opacity={0.3}
                  />
                </g>
              );
            })()}
          </svg>
        )}

        {rulerEnd && (
          <div 
            className="absolute pointer-events-none bg-black/80 backdrop-blur-md border rounded-lg px-2 py-1 text-xs font-bold shadow-2xl z-[60]"
            style={{ 
              left: rulerEnd.x + 10,
              top: rulerEnd.y + 10,
              transform: `scale(${1/scale})`,
              transformOrigin: 'top left',
              color: authorColor || 'var(--gold)',
              borderColor: `${authorColor || 'var(--gold)'}80`
            }}
          >
            {calculateDistance()} ft
          </div>
        )}
      </div>

      {/* Loading & Fog reveal prevention */}
      {isLoading && (
        <div className="absolute inset-0 z-[200] bg-[#050505] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[var(--gold)]/20 border-t-[var(--gold)] rounded-full animate-spin" />
            <span className="text-[var(--gold)] text-[10px] uppercase tracking-[0.2em] animate-pulse">
              Iniciando Escena...
            </span>
          </div>
        </div>
      )}
    </div>
  );
});


Stage.displayName = 'Stage';

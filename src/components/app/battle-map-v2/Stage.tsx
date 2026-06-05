import React, { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef, useMemo } from 'react';
import { SceneConfig, MapToken, Drawing, isVideoUrl } from '@/hooks/useBattleMap';
import { Token } from './Token';
import { DrawingLayer } from './DrawingLayer';

import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { MapTool, MeasureMode } from './Toolbar';

import cursorOpenAsset from '@/assets/cursors/cursor_open.png.asset.json';
import cursorClosedAsset from '@/assets/cursors/cursor_closed.png.asset.json';
import cursorEyeAsset from '@/assets/cursors/cursor_eye.png.asset.json';

// Custom rune-engraved cursors for the battle map.
// Hotspots are tuned so the fingertip / eye-center sits where the user expects.
const CURSOR_OPEN = `url("${cursorOpenAsset.url}") 6 4, grab`;
const CURSOR_CLOSED = `url("${cursorClosedAsset.url}") 12 8, grabbing`;
const CURSOR_EYE = `url("${cursorEyeAsset.url}") 16 16, crosshair`;



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
  onSelectionChange?: (count: number) => void;
}

export interface StageHandle {
  centerView: () => void;
  screenToWorld: (clientX: number, clientY: number) => { x: number, y: number };
  clearMultiSelection: () => void;
}

export const Stage = forwardRef<StageHandle, Props>(({ 
  battleMap, isDM, activeTool, measureMode, measureSnap, characterId, authorName, authorColor, onMeasure,
  onMapLoad, onSelectionChange
}, ref) => {
  const { activeScene, tokens, drawings, updateTokenPosition, updateTokenSize, addDrawing, removeDrawing, isLoading } = battleMap;
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

  // Multi-move selection (DM only)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const multiDragOrigins = useRef<Map<string, { x: number; y: number }>>(new Map());
  const multiDragLeaderId = useRef<string | null>(null);

  // Marquee (drag-rectangle) selection for multi-move
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const marqueeActive = useRef(false);


  // Clear selection when leaving multi-move mode
  useEffect(() => {
    if (activeTool !== 'multi-move' && selectedIds.size > 0) {
      setSelectedIds(new Set());
    }
  }, [activeTool]);

  // Notify parent of selection size changes
  useEffect(() => {
    onSelectionChange?.(selectedIds.size);
  }, [selectedIds, onSelectionChange]);

  const toggleSelectToken = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const lastMeasureTime = useRef(0);
  const bgMediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);

  // Dynamic map dimensions: auto-fit to background image + 5 cells of padding on each side.
  // Falls back to a compact 30×30 grid when no background is set.
  const [mapDims, setMapDims] = useState<{ width: number; height: number }>(() => ({
    width: (activeScene?.grid_size || 70) * 30,
    height: (activeScene?.grid_size || 70) * 30,
  }));

  useEffect(() => {
    if (!activeScene) return;
    const grid = activeScene.grid_size || 70;
    const padding = grid * 10; // 5 cells each side
    const fallback = grid * 30;

    if (!activeScene.background_url) {
      setMapDims({ width: fallback, height: fallback });
      return;
    }

    if (isVideoUrl(activeScene.background_url)) {
      const vid = document.createElement('video');
      vid.preload = 'metadata';
      vid.onloadedmetadata = () => {
        const scale = activeScene.background_scale || 1;
        setMapDims({
          width: Math.max(fallback, Math.round(vid.videoWidth * scale + padding)),
          height: Math.max(fallback, Math.round(vid.videoHeight * scale + padding)),
        });
      };
      vid.src = activeScene.background_url;
      return;
    }

    const img = new Image();
    img.onload = () => {
      const scale = activeScene.background_scale || 1;
      setMapDims({
        width: Math.max(fallback, Math.round(img.width * scale + padding)),
        height: Math.max(fallback, Math.round(img.height * scale + padding)),
      });
    };
    img.src = activeScene.background_url;
  }, [activeScene?.background_url, activeScene?.background_scale, activeScene?.grid_size]);

  // Multi-touch / Gesture state
  const activePointers = useRef(new Map<number, { x: number, y: number }>());
  const lastPinchDist = useRef<number | null>(null);

  // Token dragging state
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);

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
    
    let targetX = mapDims.width / 2;
    let targetY = mapDims.height / 2;
    
    if (myToken) {
      targetX = myToken.x + (myToken.size / 2);
      targetY = myToken.y + (myToken.size / 2);
    }
    
    const newOffsetX = (rect.width / 2) / scaleRef.current - targetX;
    const newOffsetY = (rect.height / 2) / scaleRef.current - targetY;
    
    setOffset({ x: newOffsetX, y: newOffsetY });
    toast.success(myToken ? 'Centrado en tu ficha' : 'Vista centrada');
  }, [tokens, characterId, activeScene, mapDims]);

  useImperativeHandle(ref, () => ({
    centerView,
    screenToWorld,
    clearMultiSelection: () => setSelectedIds(new Set()),
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
      x: (rect.width / 2) - mapDims.width / 2, 
      y: (rect.height / 2) - mapDims.height / 2
    });
  }, [activeScene?.id, mapDims.width, mapDims.height]);

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

      // Always snap the start point to the nearest cell center for line measurements
      // when the grid is enabled — users expect the ruler to begin from cell centers,
      // not from wherever the cursor pixel happens to land.
      const shouldSnap = activeScene && activeScene.grid_enabled && (measureSnap || measureMode === 'line');
      if (shouldSnap && !tokenId) {
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
    } else if (activeTool === 'multi-move') {
      if (tokenId) return;

      if (target.classList.contains('stage-bg') || target.closest('[data-map-background="true"]')) {
        // Start marquee selection rectangle in world coordinates
        marqueeActive.current = true;
        setMarquee({ x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y });
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

    // Marquee selection update
    if (marqueeActive.current && marquee) {
      const coords = screenToWorld(e.clientX, e.clientY);
      setMarquee({ x1: marquee.x1, y1: marquee.y1, x2: coords.x, y2: coords.y });
      return;
    }

    // Ruler logic - throttle this or it's very expensive
    if (activeTool === 'measure' && isMeasuring.current && rulerStart) {

      const coords = screenToWorld(e.clientX, e.clientY);
      let snappedCoords = coords;

      // Snap end to cell centers when grid is enabled (always for line mode
      // so the distance is reported in whole 5-ft increments).
      const shouldSnap = activeScene && activeScene.grid_enabled && (measureSnap || measureMode === 'line');
      if (shouldSnap) {
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

  };


  const handlePointerUp = (e: React.PointerEvent) => {
    const wasPinching = activePointers.current.size >= 2;
    activePointers.current.delete(e.pointerId);
    
    if (activePointers.current.size < 2) {
      lastPinchDist.current = null;
    }

    // Finalize marquee selection
    if (marqueeActive.current && marquee) {
      const minX = Math.min(marquee.x1, marquee.x2);
      const maxX = Math.max(marquee.x1, marquee.x2);
      const minY = Math.min(marquee.y1, marquee.y2);
      const maxY = Math.max(marquee.y1, marquee.y2);
      const dragged = Math.hypot(marquee.x2 - marquee.x1, marquee.y2 - marquee.y1);

      if (dragged > 4) {
        const additive = e.shiftKey || e.ctrlKey || e.metaKey;
        const hit = new Set<string>(additive ? selectedIds : []);
        tokens.forEach((t: MapToken) => {
          const cx = t.x + t.size / 2;
          const cy = t.y + t.size / 2;
          if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) {
            hit.add(t.id);
          }
        });
        setSelectedIds(hit);
      }
      marqueeActive.current = false;
      setMarquee(null);
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
      }, 6000);
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
          width: mapDims.width,
          height: mapDims.height,
          imgWidth: img.width,
          imgHeight: img.height
        });
      };
      img.src = activeScene.background_url;
    }
  }, [activeScene?.background_url, onMapLoad, mapDims.width, mapDims.height]);


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
    // Plain distance ('line') doesn't need per-cell highlights — they cause grid flicker
    // as cells appear/disappear step by step. Only AOE shapes (circle/cone) highlight cells.
    if (measureMode === 'line') return [];

    
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

  const isActiveGrab = isPanning || !!draggingTokenId;
  const stageCursor = activeTool === 'measure'
    ? CURSOR_EYE
    : isActiveGrab
      ? CURSOR_CLOSED
      : CURSOR_OPEN;

  return (
    <div 
      className="flex-1 relative overflow-hidden bg-[#050505] touch-none overscroll-none"
      style={{ cursor: stageCursor }}
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
          width: `${mapDims.width}px`,
          height: `${mapDims.height}px`,
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
                isSelected={selectedIds.has(token.id)}
                onToggleSelect={(id) => toggleSelectToken(id)}
                onMove={(x: number, y: number, isFinal: boolean = true) => {
                  // Group-move when this token is the multi-drag leader
                  if (activeTool === 'multi-move' && multiDragLeaderId.current === token.id) {
                    const leaderOrigin = multiDragOrigins.current.get(token.id);
                    if (leaderOrigin) {
                      const dx = x - leaderOrigin.x;
                      const dy = y - leaderOrigin.y;
                      multiDragOrigins.current.forEach((origin, id) => {
                        if (id === token.id) return;
                        updateTokenPosition(id, origin.x + dx, origin.y + dy, isFinal);
                      });
                    }
                    if (isFinal) {
                      multiDragOrigins.current.clear();
                      multiDragLeaderId.current = null;
                    }
                  }
                  updateTokenPosition(token.id, x, y, isFinal);
                }}
                onUpdateSize={(size: number) => updateTokenSize(token.id, size)}
                onRemove={() => battleMap.removeToken(token.id)}
                screenToWorld={screenToWorld}
                onDragStart={(id) => {
                  setDraggingTokenId(id);
                  if (activeTool === 'multi-move') {
                    // Auto-add the leader to selection
                    setSelectedIds(prev => {
                      if (prev.has(id)) return prev;
                      const next = new Set(prev);
                      next.add(id);
                      return next;
                    });
                    // Snapshot origins of all selected tokens (plus leader)
                    const origins = new Map<string, { x: number; y: number }>();
                    const ids = new Set(selectedIds);
                    ids.add(id);
                    ids.forEach(tid => {
                      const tk = tokens.find((t: MapToken) => t.id === tid);
                      if (tk) origins.set(tid, { x: tk.x, y: tk.y });
                    });
                    multiDragOrigins.current = origins;
                    multiDragLeaderId.current = id;
                  }
                }}
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
            className="absolute pointer-events-none bg-black/80 backdrop-blur-md border rounded-lg px-2 py-1 text-xs font-bold shadow-2xl z-[60] whitespace-nowrap"
            style={{ 
              left: rulerEnd.x,
              // Lift the label well above the eye cursor (~40 screen px) so the
              // distance is always readable above the pointer regardless of zoom.
              top: rulerEnd.y - 40 / scale,
              transform: `translate(-50%, -100%) scale(${1/scale})`,
              transformOrigin: 'bottom center',
              color: authorColor || 'var(--gold)',
              borderColor: `${authorColor || 'var(--gold)'}80`
            }}
          >
            {calculateDistance()} ft
          </div>
        )}

        {marquee && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: Math.min(marquee.x1, marquee.x2),
              top: Math.min(marquee.y1, marquee.y2),
              width: Math.abs(marquee.x2 - marquee.x1),
              height: Math.abs(marquee.y2 - marquee.y1),
              border: `${2 / scale}px dashed var(--gold)`,
              backgroundColor: 'rgba(234,179,8,0.12)',
              zIndex: 55,
            }}
          />
        )}
      </div>


      {/* Loading overlay */}
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

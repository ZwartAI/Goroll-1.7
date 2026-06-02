import React, { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { SceneConfig, MapToken, Drawing, isVideoUrl } from '@/hooks/useBattleMap';
import { Token } from './Token';
import { DrawingLayer } from './DrawingLayer';
import { cn } from '@/lib/utils';
import { motion, useAnimation } from 'framer-motion';
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
}

export interface StageHandle {
  centerView: () => void;
  screenToWorld: (clientX: number, clientY: number) => { x: number, y: number };
}

export const Stage = forwardRef<StageHandle, Props>(({ battleMap, isDM, activeTool, measureMode, measureSnap, characterId, authorName, authorColor, onMeasure }, ref) => {
  const { activeScene, tokens, drawings, updateTokenPosition, updateTokenSize, addDrawing, removeDrawing } = battleMap;
  const stageRef = useRef<HTMLDivElement>(null);
  
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  
  // Refs to avoid stale closures in event listeners
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  
  // Keep refs in sync immediately to avoid frame lag in coordinate conversion
  scaleRef.current = scale;
  offsetRef.current = offset;


  const [isPanning, setIsPanning] = useState(false);
  const lastPanPos = useRef({ x: 0, y: 0 });
  const bgMediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);

  // Multi-touch / Gesture state
  const activePointers = useRef(new Map<number, { x: number, y: number }>());
  const lastPinchDist = useRef<number | null>(null);

  // Token dragging state (managed by individual Token components now)
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

  const zoomAtScreenPoint = useCallback((screenX: number, screenY: number, zoomFactor: number) => {
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

    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
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

  // Prevent default browser behavior on mobile (manual listener for passive: false)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const handleTouchMove = (e: TouchEvent) => {
      // Always prevent native scroll/zoom on the map area
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
    // Only handle primary button for most things, but allow touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    
    const target = e.target as HTMLElement;
    const coords = screenToWorld(e.clientX, e.clientY);

    // Prevent panning if we're touching UI element
    if (target.closest('[data-map-ui="true"]')) {
      return;
    }

    // Check if we're clicking a token
    const tokenElement = target.closest('[data-token-id]');
    const tokenId = tokenElement?.getAttribute('data-token-id');

    // Multi-touch / Pinch zoom
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

      // If we clicked a token, link to its center
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
      
      // Capture pointer to prevent losing the ruler during fast movement
      if (stageRef.current) {
        stageRef.current.setPointerCapture(e.pointerId);
      }
    } else if (activeTool === 'move') {
      if (tokenId) return; // Token handles its own drag

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
    let coords = screenToWorld(e.clientX, e.clientY);

    // Snap to grid if enabled for measurement
    if (activeTool === 'measure' && measureSnap && activeScene) {
      const gridSize = activeScene.grid_size;
      const offsetX = (activeScene.grid_offset_x || 0) + (gridSize / 2);
      const offsetY = (activeScene.grid_offset_y || 0) + (gridSize / 2);
      
      coords = {
        x: Math.round((coords.x - offsetX) / gridSize) * gridSize + offsetX,
        y: Math.round((coords.y - offsetY) / gridSize) * gridSize + offsetY
      };
    }

    // Pinch Zoom Handling
    if (activePointers.current.size >= 2 && lastPinchDist.current !== null) {
      const pointers = Array.from(activePointers.current.values());
      const dist = Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y);
      
      const centerX = (pointers[0].x + pointers[1].x) / 2;
      const centerY = (pointers[0].y + pointers[1].y) / 2;
      
      const zoomFactor = dist / lastPinchDist.current;
      zoomAtScreenPoint(centerX, centerY, zoomFactor);
      
      lastPinchDist.current = dist;
      return;
    }

    if (draggingTokenId) {
      // Logic moved to Token.tsx
      return;
    }


    if (activeTool === 'measure' && isMeasuring.current && rulerStart) {
      setRulerEnd(coords);
    } else if (isPanning && activePointers.current.size === 1) {
      const dx = (e.clientX - lastPanPos.current.x) / scaleRef.current;
      const dy = (e.clientY - lastPanPos.current.y) / scaleRef.current;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPanPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) {
      lastPinchDist.current = null;
    }

    if (draggingTokenId) {
      setDraggingTokenId(null);
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
        // Only clear if another measurement hasn't started
        if (!isMeasuring.current) {
          setRulerStart(null);
          setRulerEnd(null);
        }
      }, 3000);
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
    zoomAtScreenPoint(e.clientX, e.clientY, zoomFactor);
  };

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
    
    if (radius < 2) return [];

    // Bounding box for searching cells
    const searchRadius = radius + gridSize;
    const minX = rulerStart.x - searchRadius;
    const maxX = rulerStart.x + searchRadius;
    const minY = rulerStart.y - searchRadius;
    const maxY = rulerStart.y + searchRadius;
    
    // Grid range
    const startCol = Math.floor((minX - (activeScene.grid_offset_x || 0)) / gridSize);
    const endCol = Math.ceil((maxX - (activeScene.grid_offset_x || 0)) / gridSize);
    const startRow = Math.floor((minY - (activeScene.grid_offset_y || 0)) / gridSize);
    const endRow = Math.ceil((maxY - (activeScene.grid_offset_y || 0)) / gridSize);
    
    const cells: {x: number, y: number}[] = [];
    const angle = Math.atan2(dy, dx);
    const halfSpread = (30 * Math.PI) / 180;
    
    // Use a small buffer to avoid searching the entire 8000x8000 map
    const maxSearch = 40; // Don't check more than 40x40 cells for performance
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
        
        // Sample points in the cell to determine coverage
        let pointsInside = 0;
        const samples = 4; // 4x4 grid = 16 points
        const threshold = 10; // ~62.5% (10/16)
        
        for (let sx = 0; sx < samples; sx++) {
          for (let sy = 0; sy < samples; sy++) {
            const px = cellX + (sx + 0.5) * (gridSize / samples);
            const py = cellY + (sy + 0.5) * (gridSize / samples);
            
            let inside = false;
            const distToStart = Math.hypot(px - rulerStart.x, py - rulerStart.y);

            if (measureMode === 'circle') {
              inside = distToStart <= radius;
            } else if (measureMode === 'cone') {
              if (distToStart <= radius) {
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
          if (pointsInside >= threshold) break; // Optimization
        }
        
        if (pointsInside >= threshold) {
          cells.push({ x: cellX, y: cellY });
        }
      }
    }
    return cells;
  }, [rulerStart, rulerEnd, measureMode, activeScene]);

  // No longer needed locally since we export it from useBattleMap
  // but keeping the call compatible
  const isVideo = isVideoUrl;

  return (
    <div 
      className={cn(
        "flex-1 relative overflow-hidden bg-[#050505] touch-none overscroll-none",
        activeTool === 'move' ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"
      )}
      style={{ 
        touchAction: "none",
        overscrollBehavior: "none"
      }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
      ref={stageRef}
    >
      <div 
        className="absolute inset-0 origin-top-left stage-bg"
        data-map-background="true"
        style={{ 
          transform: `translate(${offset.x * scale}px, ${offset.y * scale}px) scale(${scale})`,
          width: '8000px',
          height: '8000px'
        }}
      >
        {/* Map Background Layer */}
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
                  ref={(el) => { bgMediaRef.current = el; }}
                  src={activeScene.background_url} 
                  autoPlay loop muted playsInline
                  className="max-w-none max-h-none shadow-2xl"
                  style={{ width: 'auto', height: 'auto' }}
                  onError={() => toast.error('Error al cargar video')}
                  onLoadedMetadata={() => {
                    // Trigger a re-center once metadata is loaded
                    if (stageRef.current) {
                      const rect = stageRef.current.getBoundingClientRect();
                      setOffset(prev => ({ ...prev })); // Force effect
                    }
                  }}
                />
              ) : (
                <img 
                  ref={(el) => { bgMediaRef.current = el; }}
                  src={activeScene.background_url} 
                  alt="" 
                  className="max-w-none max-h-none shadow-2xl"
                  style={{ width: 'auto', height: 'auto' }}
                  onError={() => toast.error('Error al cargar imagen')}
                  onLoad={() => {
                    // Trigger a re-center once image is loaded
                    if (stageRef.current) {
                      const rect = stageRef.current.getBoundingClientRect();
                      setOffset(prev => ({ ...prev })); // Force effect
                    }
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Grid Layer - Always on top of background */}
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

        {/* Grid Highlight Layer */}
        {highlightedCells.map((cell, i) => (
          <div 
            key={`${cell.x}-${cell.y}-${i}`}
            className="absolute pointer-events-none bg-[var(--gold)]/20 border border-[var(--gold)]/30"
            style={{ 
              left: cell.x,
              top: cell.y,
              width: activeScene.grid_size,
              height: activeScene.grid_size,
              zIndex: 1.5
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

        {/* Tokens Layer */}
        <div style={{ zIndex: 10, position: 'absolute', inset: 0 }} className="pointer-events-none">
          {(() => {
            // Prioritize current player's tokens to be on top for easier selection
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
                onMove={(x: number, y: number, isFinal: boolean = true) => updateTokenPosition(token.id, x, y, isFinal)}
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

        {/* Ruler Layer */}
        {rulerStart && rulerEnd && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 50 }}>
            {measureMode === 'line' && (
              <>
                <line 
                  x1={rulerStart.x} y1={rulerStart.y} 
                  x2={rulerEnd.x} y2={rulerEnd.y} 
                  stroke="var(--gold)" strokeWidth={2 / scale} strokeDasharray={`${5 / scale},${5 / scale}`} 
                />
                <circle cx={rulerStart.x} cy={rulerStart.y} r={4 / scale} fill="var(--gold)" />
                <circle cx={rulerEnd.x} cy={rulerEnd.y} r={4 / scale} fill="var(--gold)" />
              </>
            )}

            {measureMode === 'circle' && (
              <>
                <circle 
                  cx={rulerStart.x} cy={rulerStart.y} 
                  r={Math.hypot(rulerEnd.x - rulerStart.x, rulerEnd.y - rulerStart.y)} 
                  fill="var(--gold)" fillOpacity="0.1"
                  stroke="var(--gold)" strokeWidth={2 / scale} strokeDasharray={`${5 / scale},${5 / scale}`}
                />
                <line 
                  x1={rulerStart.x} y1={rulerStart.y} 
                  x2={rulerEnd.x} y2={rulerEnd.y} 
                  stroke="var(--gold)" strokeWidth={1 / scale} opacity="0.5"
                />
                <circle cx={rulerStart.x} cy={rulerStart.y} r={4 / scale} fill="var(--gold)" />
              </>
            )}

            {measureMode === 'cone' && (() => {
              const dx = rulerEnd.x - rulerStart.x;
              const dy = rulerEnd.y - rulerStart.y;
              const radius = Math.hypot(dx, dy);
              const angle = Math.atan2(dy, dx);
              const halfSpread = (30 * Math.PI) / 180; // 30 degrees each side for 60 total
              
              const startAngle = angle - halfSpread;
              const endAngle = angle + halfSpread;
              
              const x1 = rulerStart.x + radius * Math.cos(startAngle);
              const y1 = rulerStart.y + radius * Math.sin(startAngle);
              const x2 = rulerStart.x + radius * Math.cos(endAngle);
              const y2 = rulerStart.y + radius * Math.sin(endAngle);
              
              const pathData = `
                M ${rulerStart.x} ${rulerStart.y}
                L ${x1} ${y1}
                A ${radius} ${radius} 0 0 1 ${x2} ${y2}
                Z
              `;
              
              return (
                <>
                  <path 
                    d={pathData}
                    fill="var(--gold)" fillOpacity="0.1"
                    stroke="var(--gold)" strokeWidth={2 / scale} strokeDasharray={`${5 / scale},${5 / scale}`}
                  />
                  <line 
                    x1={rulerStart.x} y1={rulerStart.y} 
                    x2={rulerEnd.x} y2={rulerEnd.y} 
                    stroke="var(--gold)" strokeWidth={1 / scale} opacity="0.5"
                  />
                  <circle cx={rulerStart.x} cy={rulerStart.y} r={4 / scale} fill="var(--gold)" />
                </>
              );
            })()}

            <foreignObject 
              x={rulerEnd.x + (10 / scale)} y={rulerEnd.y + (10 / scale)} 
              width={150 / scale} height={60 / scale}
            >
              <div 
                className="bg-black/80 border border-[var(--gold)]/30 px-2 py-1 rounded text-[var(--gold)] font-bold shadow-xl"
                style={{ fontSize: `${12 / scale}px` }}
              >
                {calculateDistance()} ft
              </div>
            </foreignObject>
          </svg>
        )}
      </div>

    </div>
  );
});

import React, { useRef, useState, useEffect } from 'react';
import { SceneConfig, MapToken, Drawing } from '@/hooks/useBattleMap';
import { Token } from './Token';
import { DrawingLayer } from './DrawingLayer';
import { cn } from '@/lib/utils';
import { motion, useAnimation } from 'framer-motion';
import { toast } from 'sonner';

import { MapTool } from './Toolbar';

interface Props {
  battleMap: any;
  isDM: boolean;
  activeTool: MapTool;
  characterId?: string;
}

export function Stage({ battleMap, isDM, activeTool, characterId }: Props) {
  const { activeScene, tokens, drawings, updateTokenPosition, updateTokenSize, addDrawing, removeDrawing } = battleMap;
  const stageRef = useRef<HTMLDivElement>(null);
  
  // Initialize scale and offset to center the view
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPos = useRef({ x: 0, y: 0 });
  const bgMediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);

  // Center the view ONLY on initial load or scene change
  useEffect(() => {
    const centerView = () => {
      if (!stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      
      // Default center: world origin (0,0) in middle of screen
      let targetWorldX = 0;
      let targetWorldY = 0;

      // If background exists and is loaded, we can center on it better
      if (activeScene?.background_url && bgMediaRef.current) {
        // We'll keep it simple for now and center at world 0,0
        // which is where the image center is positioned by CSS
        targetWorldX = 0; 
        targetWorldY = 0;
      }

      setOffset({ 
        x: (rect.width / 2) / scale - targetWorldX, 
        y: (rect.height / 2) / scale - targetWorldY
      });
    };

    centerView();
  }, [activeScene?.id]); // REMOVED scale from dependencies to prevent reset on zoom
  
  // Ruler State
  const [rulerStart, setRulerStart] = useState<{ x: number, y: number } | null>(null);
  const [rulerEnd, setRulerEnd] = useState<{ x: number, y: number } | null>(null);

  const getRelativeCoords = (e: React.PointerEvent | React.WheelEvent) => {
    if (!stageRef.current) return { x: 0, y: 0 };
    const rect = stageRef.current.getBoundingClientRect();
    
    // Calculate local coordinates inside the scaled/panned container
    return {
      x: (e.clientX - rect.left) / scale - offset.x,
      y: (e.clientY - rect.top) / scale - offset.y
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    
    // Prevent panning if we're touching a token or UI element
    if (target.closest('[data-token="true"]') || target.closest('[data-map-ui="true"]')) {
      return;
    }

    const coords = getRelativeCoords(e);
    if (activeTool === 'measure') {
      setRulerStart(coords);
      setRulerEnd(coords);
    } else if (activeTool === 'move') {
      // Check if clicking on stage background
      if (target.classList.contains('stage-bg') || target.closest('[data-map-background="true"]')) {
        setIsPanning(true);
        lastPanPos.current = { x: e.clientX, y: e.clientY };
        target.setPointerCapture(e.pointerId);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activeTool === 'measure' && rulerStart) {
      setRulerEnd(getRelativeCoords(e));
    } else if (isPanning) {
      const dx = (e.clientX - lastPanPos.current.x) / scale;
      const dy = (e.clientY - lastPanPos.current.y) / scale;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPanPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeTool === 'measure') {
      setTimeout(() => {
        setRulerStart(null);
        setRulerEnd(null);
      }, 3000);
    }
    setIsPanning(false);
    if (e.target instanceof Element) {
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Ignore capture errors
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Check if we are over the stage background or a non-interactive element
    // to allow scrolling sidebars/logs if the mouse is over them
    if (!(e.target as HTMLElement).closest('.stage-bg')) {
      // If it's not the stage, let the default scroll happen (e.g. for sidebar/logs)
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (!stageRef.current) return;

    const rect = stageRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const oldScale = scale;
    // zoomFactor logic - smaller increments for smoother zoom
    const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
    const newScale = Math.min(Math.max(oldScale * zoomFactor, 0.25), 5);

    // If scale hasn't changed (hit limits), don't update offset
    if (newScale === oldScale) return;

    // Calculate world coordinates of the mouse before zoom
    const worldX = mouseX / oldScale - offset.x;
    const worldY = mouseY / oldScale - offset.y;

    // Calculate new offset to keep world coordinates under mouse
    const newOffsetX = mouseX / newScale - worldX;
    const newOffsetY = mouseY / newScale - worldY;

    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
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

  const isVideo = (url: string) => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
    return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
  };

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
        style={{ 
          transform: `scale(${scale}) translate(${offset.x}px, ${offset.y}px)`,
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

        {/* Drawing Layer */}
        <div style={{ zIndex: 2, position: 'absolute', inset: 0 }} className="pointer-events-none">
          <DrawingLayer 
            drawings={drawings} 
            onAddDrawing={addDrawing}
            onRemoveDrawing={removeDrawing}
            activeTool={activeTool}
            gridSize={activeScene.grid_size}
            characterId={characterId}
            scale={scale}
            offset={offset}
          />
        </div>

        {/* Tokens Layer */}
        <div style={{ zIndex: 10, position: 'absolute', inset: 0 }} className="pointer-events-none">
          {tokens.map((token: MapToken) => (
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
                onMove={(x: number, y: number) => updateTokenPosition(token.id, x, y)}
                onUpdateSize={(size: number) => updateTokenSize(token.id, size)}
                onRemove={() => battleMap.removeToken(token.id)}
              />
            </div>
          ))}
        </div>

        {/* Ruler Layer */}
        {rulerStart && rulerEnd && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 50 }}>
            <line 
              x1={rulerStart.x} y1={rulerStart.y} 
              x2={rulerEnd.x} y2={rulerEnd.y} 
              stroke="var(--gold)" strokeWidth={2 / scale} strokeDasharray={`${5 / scale},${5 / scale}`} 
            />
            <circle cx={rulerStart.x} cy={rulerStart.y} r={4 / scale} fill="var(--gold)" />
            <circle cx={rulerEnd.x} cy={rulerEnd.y} r={4 / scale} fill="var(--gold)" />
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
}

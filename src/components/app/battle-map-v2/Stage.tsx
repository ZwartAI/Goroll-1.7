import React, { useRef, useState, useEffect } from 'react';
import { SceneConfig, MapToken, Drawing } from '@/hooks/useBattleMap';
import { Token } from './Token';
import { DrawingLayer } from './DrawingLayer';
import { cn } from '@/lib/utils';
import { motion, useAnimation } from 'framer-motion';

interface Props {
  battleMap: any;
  isDM: boolean;
  activeTool: 'move' | 'measure' | 'pencil';
  characterId?: string;
}

export function Stage({ battleMap, isDM, activeTool, characterId }: Props) {
  const { activeScene, tokens, drawings, updateTokenPosition, updateTokenSize, addDrawing } = battleMap;
  const stageRef = useRef<HTMLDivElement>(null);
  
  // Initialize scale and offset to center the view
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPos = useRef({ x: 0, y: 0 });

  // Center the view on initial load or scene change
  useEffect(() => {
    if (stageRef.current) {
      const rect = stageRef.current.getBoundingClientRect();
      setOffset({ 
        x: rect.width / 2 / scale, 
        y: rect.height / 2 / scale 
      });
    }
  }, [activeScene?.id, scale]);
  
  // Ruler State
  const [rulerStart, setRulerStart] = useState<{ x: number, y: number } | null>(null);
  const [rulerEnd, setRulerEnd] = useState<{ x: number, y: number } | null>(null);

  const getRelativeCoords = (e: React.MouseEvent | React.TouchEvent) => {
    if (!stageRef.current) return { x: 0, y: 0 };
    const rect = stageRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // Calculate local coordinates inside the scaled/panned container
    return {
      x: (clientX - rect.left) / scale - offset.x,
      y: (clientY - rect.top) / scale - offset.y
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getRelativeCoords(e);
    if (activeTool === 'measure') {
      setRulerStart(coords);
      setRulerEnd(coords);
    } else if (activeTool === 'move') {
      // Check if clicking on stage background (not on a token handled by its own component)
      if ((e.target as HTMLElement).classList.contains('stage-bg')) {
        setIsPanning(true);
        lastPanPos.current = { x: e.clientX, y: e.clientY };
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (activeTool === 'measure' && rulerStart) {
      setRulerEnd(getRelativeCoords(e));
    } else if (isPanning) {
      const dx = (e.clientX - lastPanPos.current.x) / scale;
      const dy = (e.clientY - lastPanPos.current.y) / scale;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPanPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    if (activeTool === 'measure') {
      setTimeout(() => {
        setRulerStart(null);
        setRulerEnd(null);
      }, 3000);
    }
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(Math.max(scale * delta, 0.1), 5);
      setScale(newScale);
    } else {
      // Regular scroll pannes
      setOffset(prev => ({
        x: prev.x - e.deltaX / scale,
        y: prev.y - e.deltaY / scale
      }));
    }
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
        "flex-1 relative overflow-hidden bg-[#050505] touch-none",
        activeTool === 'move' ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
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
            style={{ 
              opacity: activeScene.background_opacity,
              zIndex: 0
            }}
          >
            <div 
              style={{ 
                transformOrigin: 'top left',
                transform: `scale(${activeScene.background_scale}) translate(${activeScene.background_x}%, ${activeScene.background_y}%)`,
                width: '100%',
                height: '100%'
              }}
            >
              {isVideo(activeScene.background_url) ? (
                <video 
                  src={activeScene.background_url} 
                  autoPlay loop muted playsInline
                  className="max-w-none max-h-none shadow-2xl"
                  style={{ width: 'auto', height: 'auto' }}
                />
              ) : (
                <img 
                  src={activeScene.background_url} 
                  alt="" 
                  className="max-w-none max-h-none shadow-2xl"
                  style={{ width: 'auto', height: 'auto' }}
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
              backgroundPosition: 'center',
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
            active={activeTool === 'pencil'}
            gridSize={activeScene.grid_size}
            characterId={characterId}
            scale={scale}
            offset={offset}
          />
        </div>

        {/* Tokens Layer */}
        <div style={{ zIndex: 10, position: 'absolute', inset: 0 }} className="pointer-events-none">
          {tokens.map((token: MapToken) => (
            <Token 
              key={token.id} 
              token={token} 
              isDM={isDM} 
              canMove={isDM || token.character_id === characterId}
              gridSize={activeScene.grid_size}
              snapToGrid={activeScene.snap_to_grid}
              onMove={(x: number, y: number) => updateTokenPosition(token.id, x, y)}
              onUpdateSize={(size: number) => updateTokenSize(token.id, size)}
              onRemove={() => battleMap.removeToken(token.id)}
            />
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

      {/* Zoom & Control Indicators */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-2 z-50">
        <div className="px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[9px] uppercase tracking-widest text-white/60 pointer-events-none">
          Zoom: {Math.round(scale * 100)}%
        </div>
        {activeTool === 'move' && (
          <div className="px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[9px] uppercase tracking-widest text-white/40 pointer-events-none">
            Arrastra para mover el mapa
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useRef, useState, useEffect } from 'react';
import { SceneConfig, MapToken, Drawing } from '@/hooks/useBattleMap';
import { Token } from './Token';
import { DrawingLayer } from './DrawingLayer';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Props {
  battleMap: any;
  isDM: boolean;
  activeTool: 'move' | 'measure' | 'pencil';
  characterId?: string;
}

export function Stage({ battleMap, isDM, activeTool, characterId }: Props) {
  const { activeScene, tokens, drawings, updateTokenPosition, addDrawing } = battleMap;
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  
  // Ruler State
  const [rulerStart, setRulerStart] = useState<{ x: number, y: number } | null>(null);
  const [rulerEnd, setRulerEnd] = useState<{ x: number, y: number } | null>(null);

  const getRelativeCoords = (e: React.MouseEvent) => {
    if (!stageRef.current) return { x: 0, y: 0 };
    const rect = stageRef.current.getBoundingClientRect();
    // Adjust for current scale and offset if needed, but for simple layer it's easier to just use the rect
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'measure') {
      setRulerStart(getRelativeCoords(e));
      setRulerEnd(getRelativeCoords(e));
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (activeTool === 'measure' && rulerStart) {
      setRulerEnd(getRelativeCoords(e));
    }
  };

  const handleMouseUp = () => {
    if (activeTool === 'measure') {
      // Keep it for a moment or clear it? User says "Al soltar: puede desaparecer después de unos segundos"
      setTimeout(() => {
        setRulerStart(null);
        setRulerEnd(null);
      }, 2000);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale(s => Math.min(Math.max(s * delta, 0.1), 5));
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

  return (
    <div 
      className={cn(
        "flex-1 relative overflow-hidden bg-[#050505]",
        activeTool === 'move' ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      ref={stageRef}
    >
      <div 
        className="absolute inset-0 origin-top-left"
        style={{ 
          transform: `scale(${scale}) translate(${offset.x}px, ${offset.y}px)`,
          width: '5000px', // Large enough area
          height: '5000px'
        }}
      >
        {/* Map Background Layer */}
        {activeScene.background_url && (
          <div 
            className="absolute inset-0 bg-no-repeat bg-center"
            style={{ 
              backgroundImage: `url(${activeScene.background_url})`,
              backgroundSize: `${activeScene.background_scale * 100}%`,
              opacity: activeScene.background_opacity,
              backgroundPosition: `${50 + activeScene.background_x}% ${50 + activeScene.background_y}%`
            }}
          />
        )}

        {/* Grid Layer */}
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
              opacity: activeScene.grid_opacity
            }}
          />
        )}

        {/* Drawing Layer */}
        <DrawingLayer 
          drawings={drawings} 
          onAddDrawing={addDrawing}
          active={activeTool === 'pencil'}
          gridSize={activeScene.grid_size}
          characterId={characterId}
        />

        {/* Tokens Layer */}
        {tokens.map((token: MapToken) => (
          <Token 
            key={token.id} 
            token={token} 
            isDM={isDM} 
            canMove={isDM || token.character_id === characterId}
            gridSize={activeScene.grid_size}
            snapToGrid={activeScene.snap_to_grid}
            onMove={(x: number, y: number) => updateTokenPosition(token.id, x, y)}
            onRemove={() => battleMap.removeToken(token.id)}
          />
        ))}

        {/* Ruler Layer */}
        {rulerStart && rulerEnd && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-50">
            <line 
              x1={rulerStart.x} y1={rulerStart.y} 
              x2={rulerEnd.x} y2={rulerEnd.y} 
              stroke="var(--gold)" strokeWidth="2" strokeDasharray="5,5" 
            />
            <circle cx={rulerStart.x} cy={rulerStart.y} r="4" fill="var(--gold)" />
            <circle cx={rulerEnd.x} cy={rulerEnd.y} r="4" fill="var(--gold)" />
            <foreignObject 
              x={rulerEnd.x + 10} y={rulerEnd.y + 10} 
              width="100" height="40"
            >
              <div className="bg-black/80 border border-[var(--gold)]/30 px-2 py-1 rounded text-[var(--gold)] text-[10px] font-bold">
                {calculateDistance()} ft
              </div>
            </foreignObject>
          </svg>
        )}
      </div>

      {/* Zoom Indicator */}
      <div className="absolute bottom-6 left-6 px-3 py-1 bg-black/60 border border-white/10 rounded-full text-[9px] uppercase tracking-widest text-white/60 pointer-events-none z-50">
        Zoom: {Math.round(scale * 100)}%
      </div>
    </div>
  );
}

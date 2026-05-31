import React, { useRef, useState, useEffect } from 'react';
import { SceneConfig, MapToken, Drawing } from '@/hooks/useBattleMap';
import { Token } from './Token';
import { DrawingLayer } from './DrawingLayer';
import { cn } from '@/lib/utils';
import { motion, useMotionValue, useSpring } from 'framer-motion';

interface Props {
  battleMap: any; // Return type of useBattleMap
  isDM: boolean;
  activeTool: 'move' | 'measure' | 'pencil';
  characterId?: string;
}

export function Stage({ battleMap, isDM, activeTool, characterId }: Props) {
  const { activeScene, tokens, drawings, updateTokenPosition, addDrawing } = battleMap;
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Handle Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale(s => Math.min(Math.max(s * delta, 0.1), 5));
    }
  };

  // Handle Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && activeTool === 'move' && !isDM)) { // Middle click or Left click if tool is move
      // Simple pan could be added here
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

  return (
    <div 
      className="flex-1 relative overflow-hidden bg-[#050505] cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      ref={stageRef}
    >
      <div 
        className="absolute inset-0 transition-transform duration-75 origin-center"
        style={{ 
          transform: `scale(${scale}) translate(${offset.x}px, ${offset.y}px)`,
          width: '100%',
          height: '100%'
        }}
      >
        {/* Map Background Layer */}
        {activeScene.background_url ? (
          <div 
            className="absolute inset-0 bg-no-repeat bg-center"
            style={{ 
              backgroundImage: `url(${activeScene.background_url})`,
              backgroundSize: `${activeScene.background_scale * 100}%`,
              opacity: activeScene.background_opacity,
              backgroundPosition: `${50 + activeScene.background_x}% ${50 + activeScene.background_y}%`
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/10 pointer-events-none">
            <span className="font-display text-[8px] uppercase tracking-[0.5em]">No hay mapa cargado</span>
          </div>
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
      </div>

      {/* Zoom Indicator */}
      <div className="absolute bottom-6 left-6 px-3 py-1 bg-black/60 border border-white/10 rounded-full text-[9px] uppercase tracking-widest text-white/60 pointer-events-none">
        Zoom: {Math.round(scale * 100)}%
      </div>
    </div>
  );
}

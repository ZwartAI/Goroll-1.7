import React from 'react';
import { Layers, Plus, Play, Trash2, X, Image as ImageIcon, Video, Save, Edit3, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChalkLine, ChalkNote } from './BattleMapChalkLayer';

// FASE 5: Battle Map Scene Management
export interface BattleMapScene {
  id: string;
  campaign_id: string;
  name: string;
  background_url: string;
  background_type: 'image' | 'video';
  background_scale: number;
  background_opacity: number;
  background_brightness: number;
  grid_size: number;
  grid_color: string;
  grid_opacity: number;
  show_grid: boolean;
  tokens_state: Record<string, { x: number; y: number }>;
  chalk_lines: ChalkLine[];
  chalk_notes: ChalkNote[];
  is_active: boolean;
}

interface Props {
  scenes: BattleMapScene[];
  activeSceneId?: string;
  hasBackground: boolean;
  onSelectScene: (sceneId: string) => void;
  onActivateScene: (sceneId: string) => void;
  onOpenAddScene: () => void;
  onDeleteScene: (sceneId: string) => void;
  onDuplicateScene: (sceneId: string) => void;
  onOpenConfig: () => void;
  onClose: () => void;
}

export const BattleMapScenesPanel: React.FC<Props> = ({
  scenes,
  activeSceneId,
  hasBackground,
  onSelectScene,
  onActivateScene,
  onOpenAddScene,
  onDeleteScene,
  onDuplicateScene,
  onOpenConfig,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className="w-full max-w-lg bg-[#0a0a0c]/98 border border-white/10 flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
      <div className="p-4 border-b border-white/10 bg-black/40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <h2 className="font-display text-[10px] uppercase tracking-[0.3em] text-[var(--gold)] flex items-center gap-2">
              <Layers size={14} />
              Gestión de Escenas
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-muted-foreground hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Add Scene Inline */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input 
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[10px] uppercase tracking-wider focus:outline-none focus:border-[var(--gold)]/50 placeholder:text-muted-foreground/30"
              placeholder="Nombre de la nueva escena..."
              id="new-scene-name-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const input = e.currentTarget;
                  if (input.value.trim()) {
                    onOpenAddScene(); // We'll adapt this in BattleMap.tsx to take the name or use a ref
                    // For now, let's just trigger the existing modal as a fallback or handle it here
                  }
                }
              }}
            />
          </div>
          <Button 
            className="bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-black text-[9px] font-bold tracking-widest uppercase h-auto px-4"
            onClick={() => {
              const input = document.getElementById('new-scene-name-input') as HTMLInputElement;
              if (input && input.value.trim()) {
                // We'll need to pass the name. Let's update the prop.
                (onOpenAddScene as any)(input.value.trim());
                input.value = '';
              }
            }}
          >
            + AÑADIR
          </Button>
        </div>
      </div>

        {/* Lista de Escenas */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          <h3 className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground px-1">Escenas Guardadas</h3>
          
          {scenes.length === 0 && (
            <p className="text-center text-[10px] text-muted-foreground py-8 opacity-40">
              No hay escenas en esta campaña.
            </p>
          )}
          
          <div className="grid grid-cols-1 gap-3">
            {scenes.map((scene) => (
              <div 
                key={scene.id}
                className={`
                  group relative ornate-card !p-3 cursor-pointer transition-all duration-300
                  ${activeSceneId === scene.id ? 'border-[var(--gold)] bg-[var(--gold)]/5' : 'bg-white/5 border-white/5 hover:bg-white/10'}
                `}
                onClick={() => onSelectScene(scene.id)}
              >
                <div className="flex items-center gap-3">
                  {/* Thumbnail / Icon */}
                  <div className="w-12 h-12 rounded-lg bg-black/60 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {scene.background_url ? (
                      scene.background_type === 'video' ? (
                        <Video className="text-white/20" size={16} />
                      ) : (
                        <img src={scene.background_url} className="w-full h-full object-cover opacity-60" alt="" />
                      )
                    ) : (
                      <Layers className="text-white/10" size={16} />
                    )}
                  </div>

                  {/* Name and Status */}
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-display text-[11px] uppercase tracking-wider truncate ${activeSceneId === scene.id ? 'text-[var(--gold)] font-bold' : 'text-foreground/90'}`}>
                      {scene.name}
                    </h4>
                    <div className="mt-0.5">
                      {scene.is_active ? (
                        <span className="text-[7px] text-[var(--gold)] font-bold uppercase tracking-widest opacity-80">ESCENA ACTIVA</span>
                      ) : (
                        <span className="text-[7px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">INACTIVA</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {!scene.is_active && (
                      <Button 
                        size="icon" 
                        className="w-8 h-8 rounded-full bg-[var(--gold)] hover:bg-[var(--gold)]/80 text-black shadow-[0_0_10px_rgba(234,179,8,0.2)]"
                        onClick={(e) => {
                          e.stopPropagation();
                          onActivateScene(scene.id);
                        }}
                      >
                        <Play size={14} fill="currentColor" />
                      </Button>
                    )}
                    <Button 
                      size="icon" 
                      variant="outline" 
                      className="w-8 h-8 rounded-full bg-white/5 border-white/10 hover:bg-white/10 text-muted-foreground hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectScene(scene.id);
                        setTimeout(() => onOpenConfig(), 50);
                      }}
                    >
                      <Edit3 size={14} />
                    </Button>
                  </div>
                </div>

                {/* Secondary Actions (Duplicate, Delete) - Only visible on hover or if selected */}
                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                   <div className="flex gap-1">
                      <Button variant="ghost" className="h-6 px-1.5 text-[8px] text-muted-foreground hover:text-white" onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateScene(scene.id);
                      }}>
                        <Copy size={10} className="mr-1" /> Duplicar
                      </Button>
                   </div>
                   <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 px-1.5 text-[8px] text-red-400/60 hover:text-red-400 hover:bg-red-400/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteScene(scene.id);
                    }}
                  >
                    <Trash2 size={10} className="mr-1" /> Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

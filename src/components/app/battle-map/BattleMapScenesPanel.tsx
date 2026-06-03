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
  onOpenAddScene: (name?: string) => void;
  onDeleteScene: (sceneId: string) => void;
  onDuplicateScene: (sceneId: string) => void;
  onOpenConfig: () => void;
  onClose: () => void;
}

export const BattleMapScenesPanel: React.FC<Props> = ({
  scenes,
  activeSceneId,
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
        <div className="p-5 border-b border-white/10 bg-black/40">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-[12px] uppercase tracking-[0.3em] text-[var(--gold)] flex items-center gap-2">
              <Layers size={16} />
              Gestión de Escenas
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-muted-foreground hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Add Scene Inline */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input 
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-[10px] uppercase tracking-wider focus:outline-none focus:border-[var(--gold)]/50 placeholder:text-muted-foreground/30"
                placeholder="Nombre de la nueva escena..."
                id="new-scene-name-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.currentTarget;
                    if (input.value.trim()) {
                      onOpenAddScene(input.value.trim());
                      input.value = '';
                    }
                  }
                }}
              />
            </div>
            <Button 
              className="bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-black text-[10px] font-bold tracking-widest uppercase h-auto px-6 rounded-lg"
              onClick={() => {
                const input = document.getElementById('new-scene-name-input') as HTMLInputElement;
                if (input && input.value.trim()) {
                  onOpenAddScene(input.value.trim());
                  input.value = '';
                }
              }}
            >
              + AÑADIR
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar max-h-[60vh]">
          {scenes.length === 0 ? (
            <p className="text-center text-[10px] text-muted-foreground py-12 opacity-40 uppercase tracking-widest">
              No hay escenas en esta campaña.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {scenes.map((scene) => (
                <div 
                  key={scene.id}
                  className={`
                    group relative ornate-card !p-4 cursor-pointer transition-all duration-300
                    ${activeSceneId === scene.id ? 'border-[var(--gold)] bg-[var(--gold)]/5' : 'bg-white/5 border-white/5 hover:bg-white/10'}
                  `}
                  onClick={() => onSelectScene(scene.id)}
                >
                  <div className="flex items-center gap-4">
                    {/* Thumbnail / Icon */}
                    <div className="w-14 h-14 rounded-xl bg-black/60 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {scene.background_url ? (
                        scene.background_type === 'video' ? (
                          <Video className="text-white/20" size={20} />
                        ) : (
                          <img src={scene.background_url} className="w-full h-full object-cover opacity-60" alt="" />
                        )
                      ) : (
                        <Layers className="text-white/10" size={20} />
                      )}
                    </div>

                    {/* Name and Status */}
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-display text-[12px] uppercase tracking-wider truncate ${activeSceneId === scene.id ? 'text-[var(--gold)] font-bold' : 'text-foreground/90'}`}>
                        {scene.name}
                      </h4>
                      <div className="mt-1">
                        {scene.is_active ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-[var(--gold)] animate-pulse" />
                            <span className="text-[8px] text-[var(--gold)] font-bold uppercase tracking-widest">ESCENA ACTIVA</span>
                          </div>
                        ) : (
                          <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">INACTIVA</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {!scene.is_active && (
                        <Button 
                          size="icon" 
                          className="w-10 h-10 rounded-full bg-[var(--gold)] hover:bg-[var(--gold)]/80 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)] transition-transform active:scale-90"
                          onClick={(e) => {
                            e.stopPropagation();
                            onActivateScene(scene.id);
                          }}
                          title="Activar Escena"
                        >
                          <Play size={16} fill="currentColor" />
                        </Button>
                      )}
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="w-10 h-10 rounded-full bg-white/5 border-white/10 hover:bg-white/10 text-muted-foreground hover:text-white transition-transform active:scale-90"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectScene(scene.id);
                          setTimeout(() => onOpenConfig(), 100);
                        }}
                        title="Configurar Mapa"
                      >
                        <Edit3 size={16} />
                      </Button>
                    </div>
                  </div>

                  {/* Secondary Actions (Duplicate, Delete) - Only visible on hover */}
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" className="h-7 px-2 text-[9px] text-muted-foreground hover:text-white" onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateScene(scene.id);
                    }}>
                      <Copy size={12} className="mr-1.5" /> Duplicar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 px-2 text-[9px] text-red-400/60 hover:text-red-400 hover:bg-red-400/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteScene(scene.id);
                      }}
                    >
                      <Trash2 size={12} className="mr-1.5" /> Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
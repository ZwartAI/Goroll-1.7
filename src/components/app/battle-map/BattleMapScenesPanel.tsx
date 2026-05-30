import React, { useState } from 'react';
import { Layers, Plus, Play, Trash2, X, Image as ImageIcon, Video, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  onSaveCurrentAsNew: (name: string) => void;
  onDeleteScene: (sceneId: string) => void;
  onOpenConfig: () => void;
  onClose: () => void;
}

export const BattleMapScenesPanel: React.FC<Props> = ({
  scenes,
  activeSceneId,
  hasBackground,
  onSelectScene,
  onActivateScene,
  onSaveCurrentAsNew,
  onDeleteScene,
  onOpenConfig,
  onClose
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newSceneName, setNewSceneName] = useState('');

  const handleCreate = () => {
    if (newSceneName.trim()) {
      onSaveCurrentAsNew(newSceneName.trim());
      setNewSceneName('');
      setIsCreating(false);
    }
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-full sm:w-80 bg-[#0a0a0c]/98 border-r border-white/10 flex flex-col z-[110] backdrop-blur-xl shadow-2xl transition-all animate-in slide-in-from-left duration-300">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
        <div className="flex flex-col">
          <h2 className="font-display text-[10px] uppercase tracking-[0.3em] text-[var(--gold)] flex items-center gap-2">
            <Layers size={14} />
            Gestión de Escenas
          </h2>
          <span className="text-[7px] text-muted-foreground uppercase tracking-widest mt-0.5">Mapas y Entornos</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-muted-foreground hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Flujo de configuración */}
        {!hasBackground ? (
          <div className="p-6 rounded-2xl border border-dashed border-white/10 bg-white/5 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--gold)]/10 flex items-center justify-center text-[var(--gold)]">
              <ImageIcon size={24} />
            </div>
            <div>
              <p className="text-xs font-display uppercase tracking-widest text-white mb-1">Mapa Vacío</p>
              <p className="text-[10px] text-muted-foreground">Sube una imagen o video para comenzar a crear tu escena táctica.</p>
            </div>
            <Button 
              className="w-full h-10 bg-[var(--gold)] text-black font-bold text-[10px] tracking-widest"
              onClick={onOpenConfig}
            >
              CONFIGURAR FONDO
            </Button>
          </div>
        ) : (
          <>
            {!isCreating ? (
              <Button 
                variant="outline" 
                className="w-full h-12 border-dashed border-white/20 hover:border-[var(--gold)] hover:text-[var(--gold)] bg-white/5 text-[10px] font-bold tracking-widest uppercase"
                onClick={() => setIsCreating(true)}
              >
                <Save size={14} className="mr-2" />
                Guardar Vista Actual
              </Button>
            ) : (
              <div className="space-y-3 p-4 bg-[var(--gold)]/5 rounded-2xl border border-[var(--gold)]/20 animate-in zoom-in-95">
                <Input 
                  placeholder="Nombre de la escena (ej: Bosque, Mazmorra...)" 
                  value={newSceneName}
                  onChange={(e) => setNewSceneName(e.target.value)}
                  className="bg-black/40 border-white/10 text-[11px] h-9 focus-visible:ring-[var(--gold)]"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="flex-1 text-[9px] font-bold uppercase" onClick={() => setIsCreating(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" className="flex-1 text-[9px] font-bold uppercase bg-[var(--gold)] text-black" onClick={handleCreate}>
                    Confirmar
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Lista de Escenas */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          <h3 className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground px-1">Escenas Guardadas</h3>
          
          {scenes.length === 0 && !isCreating && (
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
                  ${activeSceneId === scene.id ? 'border-[var(--gold)] bg-secondary/30' : 'bg-white/5 border-transparent hover:bg-white/10'}
                `}
                onClick={() => onSelectScene(scene.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-display text-[10px] uppercase tracking-wider ${activeSceneId === scene.id ? 'text-[var(--gold)] font-bold' : 'text-foreground/80'}`}>
                    {scene.name}
                  </span>
                  {scene.is_active && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30">
                      <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[7px] text-green-400 font-bold uppercase tracking-widest">LIVE</span>
                    </div>
                  )}
                </div>

                <div 
                  className="w-full h-24 rounded-xl bg-black/60 border border-white/5 mb-3 overflow-hidden flex items-center justify-center relative group-hover:border-white/20 transition-all"
                >
                  {scene.background_url ? (
                    <>
                      {scene.background_type === 'video' ? (
                        <div className="w-full h-full flex items-center justify-center bg-black/40">
                          <Video className="text-white/20" size={30} />
                        </div>
                      ) : (
                        <img src={scene.background_url} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" alt="" />
                      )}
                    </>
                  ) : (
                    <Layers className="text-white/10" size={24} />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    className={`flex-1 h-8 text-[9px] uppercase font-bold tracking-widest transition-all ${scene.is_active ? 'bg-green-500 text-white cursor-default' : 'bg-white/5 hover:bg-[var(--gold)] hover:text-black border border-white/10'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!scene.is_active) onActivateScene(scene.id);
                    }}
                  >
                    {!scene.is_active && <Play size={10} className="mr-1.5 fill-current" />}
                    {scene.is_active ? 'Escena Actual' : 'Activar'}
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="w-8 h-8 p-0 text-red-400/60 hover:text-red-400 hover:bg-red-400/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteScene(scene.id);
                    }}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
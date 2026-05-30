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
    <aside className="fixed inset-y-0 left-0 w-full sm:w-80 bg-[#0a0a0c]/98 border-r border-white/10 flex flex-col z-[90] backdrop-blur-xl shadow-2xl transition-all animate-in slide-in-from-left duration-300">
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
        {/* PowerPoint style Add Button */}
        <Button 
          variant="outline" 
          className="w-full h-12 border-dashed border-white/20 hover:border-[var(--gold)] hover:text-[var(--gold)] bg-white/5 text-[10px] font-bold tracking-widest uppercase mb-4"
          onClick={onOpenAddScene}
        >
          <Plus size={14} className="mr-2" />
          Nueva Escena
        </Button>

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
                      <span className="text-[7px] text-green-400 font-bold uppercase tracking-widest">ACTIVA</span>
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
                  
                  {/* Quick actions overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {!scene.is_active && (
                      <Button size="sm" className="bg-[var(--gold)] text-black h-8 px-3 text-[9px] font-bold" onClick={(e) => {
                        e.stopPropagation();
                        onActivateScene(scene.id);
                      }}>
                        USAR
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={(e) => {
                      e.stopPropagation();
                      onOpenConfig();
                    }}>
                      <Edit3 size={12} />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
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
    </aside>
  );
};

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Play, Trash2, Copy, Edit2 } from 'lucide-react';
import { SceneConfig, isVideoUrl } from '@/hooks/useBattleMap';
import { cn } from '@/lib/utils';

interface Props {
  battleMap: any;
  onClose: () => void;
}

export function SceneManager({ battleMap, onClose }: Props) {
  const { scenes, createScene, activateScene, activeScene } = battleMap;
  const [newSceneName, setNewSceneName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSceneName.trim()) {
      createScene(newSceneName.trim());
      setNewSceneName('');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-lg bg-[#111] border border-[var(--gold)]/30 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        data-map-ui="true"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="font-display text-[var(--gold)] text-sm uppercase tracking-widest">
            Gestión de Escenas
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <form onSubmit={handleCreate} className="flex gap-2">
            <input 
              type="text"
              value={newSceneName}
              onChange={e => setNewSceneName(e.target.value)}
              placeholder="Nombre de la nueva escena..."
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-[var(--gold)]/50 outline-none transition-colors"
            />
            <button 
              type="submit"
              className="bg-[var(--gold)] text-black font-display text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Añadir
            </button>
          </form>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
            {scenes.map((scene: SceneConfig) => (
              <div 
                key={scene.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border transition-all duration-300",
                  scene.is_active 
                    ? "bg-[var(--gold)]/10 border-[var(--gold)]/50" 
                    : "bg-black/20 border-white/5 hover:border-white/20"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                    {scene.background_url ? (
                      isVideoUrl(scene.background_url) ? (
                        <video src={scene.background_url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={scene.background_url} alt="" className="w-full h-full object-cover" />
                      )
                    ) : (
                      <span className="text-xs opacity-20">🗺️</span>
                    )}
                  </div>
                  <div>
                    <p className={cn(
                      "text-xs font-medium",
                      scene.is_active ? "text-[var(--gold)]" : "text-white/80"
                    )}>
                      {scene.name}
                    </p>
                    <p className="text-[9px] text-white/40 uppercase tracking-tighter">
                      {scene.is_active ? 'Escena Activa' : 'Inactiva'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!scene.is_active && (
                    <button 
                      onClick={() => activateScene(scene.id)}
                      className="p-2 bg-[var(--gold)] text-black rounded-lg hover:brightness-110 transition-all"
                      title="Activar Escena"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                  )}
                  <button className="p-2 bg-white/5 text-white/60 rounded-lg hover:bg-white/10 transition-all">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

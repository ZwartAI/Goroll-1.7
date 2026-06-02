import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Grid as GridIcon, MousePointer, Image as ImageIcon, Trash2, Sliders, Film } from 'lucide-react';
import { isVideoUrl } from '@/hooks/useBattleMap';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  battleMap: any;
  onClose: () => void;
}

export function MapSettings({ battleMap, onClose }: Props) {
  const { activeScene, updateScene } = battleMap;
  const [isUploading, setIsUploading] = useState(false);

  if (!activeScene) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview local inmediata
    const reader = new FileReader();
    reader.onload = (event) => {
      // Podríamos usar esto para una preview local si quisiéramos
    };
    reader.readAsDataURL(file);

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      console.log('Uploading file:', fileName);

      const { data, error } = await supabase.storage
        .from('battle-maps')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('battle-maps')
        .getPublicUrl(filePath);

      console.log('File uploaded, public URL:', publicUrl);

      // Actualizar la escena con la nueva URL
      await updateScene({ background_url: publicUrl });
      toast.success('Fondo actualizado correctamente');
    } catch (error: any) {
      console.error('Error uploading:', error);
      toast.error('Error al subir el archivo: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsUploading(false);
      // Limpiar input
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-end p-4 bg-black/40 pointer-events-none">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, x: 100 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.9, x: 100 }}
        className="w-full max-w-sm bg-[#111]/90 border border-[var(--gold)]/30 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col pointer-events-auto mr-4"
        onClick={e => e.stopPropagation()}
        data-map-ui="true"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
          <div className="flex flex-col">
            <h2 className="font-display text-[var(--gold)] text-xs uppercase tracking-widest">
              Configuración del Mapa
            </h2>
            <div className="flex gap-2 mt-1">
              <span className="text-[8px] text-white/40 uppercase">X: {activeScene.background_x}%</span>
              <span className="text-[8px] text-white/40 uppercase">Y: {activeScene.background_y}%</span>
              <span className="text-[8px] text-white/40 uppercase">S: {activeScene.background_scale}x</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {/* Background Settings */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-[var(--gold)]">
              <ImageIcon className="w-4 h-4" />
              <h3 className="font-display text-[10px] uppercase tracking-widest">Fondo del Mapa</h3>
            </div>
            
            <div className="relative aspect-video bg-black/40 border border-white/10 rounded-xl overflow-hidden flex items-center justify-center group">
              {activeScene.background_url ? (
                <>
                  {isVideoUrl(activeScene.background_url) ? (
                    <video 
                      src={activeScene.background_url} 
                      className="w-full h-full object-cover"
                      muted loop autoPlay playsInline
                    />
                  ) : (
                    <img src={activeScene.background_url} alt="" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <label className="p-2 bg-[var(--gold)] text-black rounded-lg cursor-pointer hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5" />
                      <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,video/*" disabled={isUploading} />
                    </label>
                    <button 
                      onClick={() => updateScene({ background_url: null })}
                      className="p-2 bg-red-500 text-white rounded-lg hover:scale-105 transition-transform"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </>
              ) : (
                <label className="flex flex-col items-center gap-2 cursor-pointer hover:text-[var(--gold)] transition-colors">
                  <Upload className="w-8 h-8 opacity-40" />
                  <span className="text-[10px] uppercase tracking-widest opacity-40 text-center">Subir Mapa<br/>(Imagen o Video)</span>
                  <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,video/*" disabled={isUploading} />
                </label>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <RangeInput 
                label="Escala Fondo" 
                value={activeScene.background_scale} 
                min={0.1} max={5} step={0.1}
                onChange={(v) => updateScene({ background_scale: v })} 
              />
              <RangeInput 
                label="Opacidad Fondo" 
                value={activeScene.background_opacity} 
                min={0} max={1} step={0.1}
                onChange={(v) => updateScene({ background_opacity: v })} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <RangeInput 
                label="Desplazar X (%)" 
                value={activeScene.background_x} 
                min={-100} max={100} step={1}
                onChange={(v) => updateScene({ background_x: v })} 
              />
              <RangeInput 
                label="Desplazar Y (%)" 
                value={activeScene.background_y} 
                min={-100} max={100} step={1}
                onChange={(v) => updateScene({ background_y: v })} 
              />
            </div>
          </section>

          {/* Grid Settings */}
          <section className="space-y-3 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[var(--gold)]">
                <GridIcon className="w-4 h-4" />
                <h3 className="font-display text-[10px] uppercase tracking-widest">Cuadrícula</h3>
              </div>
              <button 
                onClick={() => updateScene({ grid_enabled: !activeScene.grid_enabled })}
                className={cn(
                  "px-3 py-1 rounded-full text-[8px] uppercase tracking-widest border transition-all",
                  activeScene.grid_enabled ? "bg-[var(--gold)]/20 border-[var(--gold)]/50 text-[var(--gold)]" : "bg-white/5 border-white/10 text-white/40"
                )}
              >
                {activeScene.grid_enabled ? 'Activada' : 'Desactivada'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <RangeInput 
                label="Tamaño Casilla" 
                value={activeScene.grid_size} 
                min={10} max={200} step={1}
                onChange={(v) => updateScene({ grid_size: v })} 
              />
              <RangeInput 
                label="Opacidad Grid" 
                value={activeScene.grid_opacity} 
                min={0} max={1} step={0.05}
                onChange={(v) => updateScene({ grid_opacity: v })} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <RangeInput 
                label="Desplazar Grid X" 
                value={activeScene.grid_offset_x} 
                min={-100} max={100} step={1}
                onChange={(v) => updateScene({ grid_offset_x: v })} 
              />
              <RangeInput 
                label="Desplazar Grid Y" 
                value={activeScene.grid_offset_y} 
                min={-100} max={100} step={1}
                onChange={(v) => updateScene({ grid_offset_y: v })} 
              />
            </div>


            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <label className="text-[9px] uppercase tracking-widest text-white/40 block mb-1">Color de Grid</label>
                <input 
                  type="color" 
                  value={activeScene.grid_color.startsWith('rgba') ? '#ffffff' : activeScene.grid_color}
                  onChange={(e) => updateScene({ grid_color: e.target.value })}
                  className="w-full h-8 bg-black/40 border border-white/10 rounded-lg cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input 
                  type="checkbox" 
                  id="snap"
                  checked={activeScene.snap_to_grid}
                  onChange={(e) => updateScene({ snap_to_grid: e.target.checked })}
                  className="w-4 h-4 rounded border-white/10 bg-black/40 text-[var(--gold)] focus:ring-[var(--gold)]/50"
                />
                <label htmlFor="snap" className="text-[10px] uppercase tracking-widest text-white/60 cursor-pointer select-none">
                  Alinear Tokens
                </label>
              </div>
            </div>
          </section>
        </div>

        <div className="p-4 bg-black/40 border-t border-white/10">
          <button 
            onClick={onClose}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-display text-[10px] uppercase tracking-widest py-3 rounded-xl transition-all"
          >
            Listo
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function RangeInput({ label, value, min, max, step, onChange }: { label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void }) {
  // Local state for smooth sliding
  const [localValue, setLocalValue] = useState(value);

  // Sync with prop when it changes from outside
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <label className="text-[9px] uppercase tracking-[0.15em] text-white/40 group-hover:text-white/60 transition-colors">{label}</label>
        <span className="text-[10px] text-[var(--gold)] font-mono font-bold">{localValue}</span>
      </div>
      <input 
        type="range" 
        min={min} max={max} step={step} 
        value={localValue} 
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          setLocalValue(val);
          onChange(val);
        }}
        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--gold)] hover:bg-white/15 transition-all outline-none focus:ring-1 focus:ring-[var(--gold)]/30"
      />
    </div>
  );
}

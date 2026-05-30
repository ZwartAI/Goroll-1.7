import React, { useRef, useState } from 'react';
import { Settings, Image as ImageIcon, Video, Grid, Palette, Sliders, X, Upload, Loader2, Trash2, Save } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MapConfig {
  backgroundUrl: string;
  backgroundType: 'image' | 'video';
  backgroundScale: number;
  backgroundOpacity: number;
  backgroundBrightness: number;
  gridSize: number;
  gridColor: string;
  gridOpacity: number;
  showGrid: boolean;
}

interface Props {
  config: MapConfig;
  onChange: (config: MapConfig) => void;
}

export const BattleMapConfigModal: React.FC<Props & { isOpen: boolean, onClose: () => void, onSaveToScene?: () => void }> = ({ config, onChange, isOpen, onClose, onSaveToScene }) => {
  const { t } = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = (key: keyof MapConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  const handleBatchChange = (updates: Partial<MapConfig>) => {
    onChange({ ...config, ...updates });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `backgrounds/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('backgrounds')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('backgrounds')
        .getPublicUrl(filePath);

      const type = file.type.startsWith('video/') ? 'video' : 'image';
      
      console.log('Background uploaded successfully:', publicUrl, 'Type:', type);
      handleBatchChange({
        backgroundUrl: publicUrl,
        backgroundType: type
      });
      toast.success(t('common.success') || 'Archivo subido correctamente');
    } catch (error: any) {
      console.error('Error uploading background:', error);
      toast.error(error.message || 'Error al subir el archivo');
    } finally {
      setIsUploading(false);
      // Limpiar el input para permitir subir el mismo archivo si se desea
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveBackground = () => {
    handleChange('backgroundUrl', '');
    toast.success('Fondo eliminado');
  };

  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-[#0a0a0c] border border-border/50 rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3 text-[var(--gold)]">
            <Grid className="w-5 h-5" />
            <h2 className="font-display text-sm uppercase tracking-widest">{t('battleMap.configTitle')}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
          {/* Background Section */}
          <div className="space-y-4">
            <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <ImageIcon size={12} /> {t('battleMap.background')}
            </h3>
            
            <div className="space-y-3">
              <div 
                className={`relative aspect-video w-full rounded-xl border border-white/10 bg-black/40 overflow-hidden flex items-center justify-center transition-all ${!config.backgroundUrl ? 'border-dashed border-white/20' : ''}`}
              >
                {config.backgroundUrl ? (
                  <>
                    {config.backgroundType === 'video' ? (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Video size={32} className="opacity-20" />
                        <span className="text-[10px] uppercase tracking-widest">Video configurado</span>
                      </div>
                    ) : (
                      <img 
                        src={config.backgroundUrl} 
                        className="w-full h-full object-cover opacity-60" 
                        alt="Preview" 
                      />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 rounded-full bg-white/10 hover:bg-[var(--gold)] hover:text-black transition-all"
                        title="Cambiar imagen/video"
                      >
                        <Upload size={16} />
                      </button>
                      <button 
                        onClick={handleRemoveBackground}
                        className="p-2 rounded-full bg-white/10 hover:bg-red-500 transition-all"
                        title="Eliminar fondo"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center text-muted-foreground">
                      <ImageIcon size={24} className="opacity-20" />
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Sin fondo seleccionado</p>
                  </div>
                )}

                {isUploading && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 z-10">
                    <Loader2 className="w-8 h-8 text-[var(--gold)] animate-spin" />
                    <span className="text-[10px] text-[var(--gold)] uppercase tracking-[0.2em] animate-pulse">Subiendo Archivo...</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="ornate-card !p-3 flex items-center justify-center gap-3 hover:bg-secondary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload size={14} className="text-[var(--gold)]" />
                  <span className="text-[9px] uppercase tracking-widest font-bold">
                    {config.backgroundUrl ? 'Cambiar Imagen/Video' : 'Subir Imagen/Video'}
                  </span>
                </button>
                {onSaveToScene && config.backgroundUrl && (
                  <button 
                    onClick={onSaveToScene}
                    className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-all text-[9px] uppercase tracking-widest font-bold"
                  >
                    <Save size={12} />
                    Guardar en Escena Actual
                  </button>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*,video/mp4,video/webm" 
                  className="hidden" 
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="text-[9px] uppercase text-muted-foreground tracking-widest">Escala del Mapa</label>
                    <span className="text-[9px] font-display text-[var(--gold)]">{config.backgroundScale.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range" min="0.1" max="5" step="0.1" 
                    value={config.backgroundScale} 
                    onChange={(e) => handleChange('backgroundScale', parseFloat(e.target.value))}
                    className="w-full accent-[var(--gold)]" 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="text-[9px] uppercase text-muted-foreground">Opacidad</label>
                    <span className="text-[9px] font-display text-[var(--gold)]">{Math.round(config.backgroundOpacity * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.05" 
                    value={config.backgroundOpacity} 
                    onChange={(e) => handleChange('backgroundOpacity', parseFloat(e.target.value))}
                    className="w-full accent-[var(--gold)]" 
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="text-[9px] uppercase text-muted-foreground">Brillo</label>
                    <span className="text-[9px] font-display text-[var(--gold)]">{Math.round(config.backgroundBrightness * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="2" step="0.05" 
                    value={config.backgroundBrightness} 
                    onChange={(e) => handleChange('backgroundBrightness', parseFloat(e.target.value))}
                    className="w-full accent-[var(--gold)]" 
                  />
                </div>
            </div>
          </div>

          {/* Grid Section */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Grid size={12} /> {t('battleMap.grid')}
              </h3>
              <button 
                onClick={() => handleChange('showGrid', !config.showGrid)}
                className={`px-3 py-1 rounded-full text-[9px] font-display uppercase tracking-widest border transition-all ${config.showGrid ? 'bg-[var(--gold)] text-black border-[var(--gold)]' : 'border-white/20 text-muted-foreground'}`}
              >
                {config.showGrid ? 'Visible' : 'Oculta'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-[9px] uppercase text-muted-foreground">Tamaño Casilla (px)</label>
                  <span className="text-[9px] font-display text-[var(--gold)]">{config.gridSize}px</span>
                </div>
                <input 
                  type="range" min="20" max="200" step="5" 
                  value={config.gridSize} 
                  onChange={(e) => handleChange('gridSize', parseInt(e.target.value))}
                  className="w-full accent-[var(--gold)]" 
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-[9px] uppercase text-muted-foreground">Opacidad Grid</label>
                  <span className="text-[9px] font-display text-[var(--gold)]">{Math.round(config.gridOpacity * 100)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.05" 
                  value={config.gridOpacity} 
                  onChange={(e) => handleChange('gridOpacity', parseFloat(e.target.value))}
                  className="w-full accent-[var(--gold)]" 
                />
              </div>
            </div>

            <div className="space-y-2">
               <label className="text-[9px] uppercase text-muted-foreground">Color de Grid</label>
               <div className="flex gap-2">
                  {['rgba(255,255,255,0.3)', 'rgba(0,0,0,0.5)', 'rgba(234,179,8,0.4)', 'rgba(59,130,246,0.4)'].map(color => (
                    <button 
                      key={color}
                      onClick={() => handleChange('gridColor', color)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform active:scale-90 ${config.gridColor === color ? 'border-[var(--gold)] scale-110' : 'border-white/10'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

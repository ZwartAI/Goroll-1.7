import React, { useRef, useState } from 'react';
import { Settings, Image as ImageIcon, Video, Grid, Palette, Sliders, X } from 'lucide-react';
import { useT } from '@/lib/i18n';

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

export const BattleMapConfigModal: React.FC<Props> = ({ config, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (key: keyof MapConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      handleChange('backgroundUrl', url);
      handleChange('backgroundType', type);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-6 right-6 w-12 h-12 bg-black/60 backdrop-blur-md rounded-full border border-[var(--gold)]/50 flex items-center justify-center text-[var(--gold)] shadow-lg hover:scale-110 active:scale-95 transition-all z-30 group"
        title="Configurar Mapa"
      >
        <Settings className="w-6 h-6 group-hover:rotate-45 transition-transform" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200" onClick={() => setIsOpen(false)}>
      <div 
        className="w-full max-w-md bg-[#0a0a0c] border border-border/50 rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3 text-[var(--gold)]">
            <Grid className="w-5 h-5" />
            <h2 className="font-display text-sm uppercase tracking-widest">{t('battleMap.configTitle')}</h2>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
          {/* Background Section */}
          <div className="space-y-4">
            <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <ImageIcon size={12} /> {t('battleMap.background')}
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="ornate-card !p-3 flex flex-col items-center gap-2 hover:bg-secondary/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center">
                  <ImageIcon size={16} className="text-[var(--gold)]" />
                </div>
                <span className="text-[9px] uppercase tracking-widest">Subir Imagen/Video</span>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/mp4" className="hidden" />
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="text-[9px] uppercase text-muted-foreground">Escala</label>
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

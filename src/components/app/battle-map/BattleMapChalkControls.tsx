import React from 'react';
import { Undo2, Trash2, X, Pencil, Type, Palette } from 'lucide-react';

// FASE 4: Chalk Drawing Controls
// Interfaz de usuario para la herramienta de dibujo

export type ChalkTool = 'pencil' | 'note';
export type ChalkSize = 2 | 5 | 10;
export type ChalkColor = '#ffffff' | '#ff4d4d' | '#ffd700';

interface Props {
  activeTool: ChalkTool;
  onToolChange: (tool: ChalkTool) => void;
  currentColor: ChalkColor;
  onColorChange: (color: ChalkColor) => void;
  currentSize: ChalkSize;
  onSizeChange: (size: ChalkSize) => void;
  onUndo: () => void;
  onClear: () => void;
  onExit: () => void;
}

export const BattleMapChalkControls: React.FC<Props> = ({
  activeTool,
  onToolChange,
  currentColor,
  onColorChange,
  currentSize,
  onSizeChange,
  onUndo,
  onClear,
  onExit
}) => {
  return (
    <div className="absolute top-20 right-4 z-[60] flex flex-col gap-3 animate-in slide-in-from-right duration-300">
      {/* Panel Principal */}
      <div className="bg-[#1a1a1e]/90 backdrop-blur-md border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-4">
        {/* Herramientas principales */}
        <div className="flex flex-col gap-2 border-b border-white/5 pb-2">
          <button
            onClick={() => onToolChange('pencil')}
            className={`p-2.5 rounded-xl transition-all ${activeTool === 'pencil' ? 'bg-[var(--gold)] text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'text-muted-foreground hover:bg-white/5'}`}
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={() => onToolChange('note')}
            className={`p-2.5 rounded-xl transition-all ${activeTool === 'note' ? 'bg-[var(--gold)] text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'text-muted-foreground hover:bg-white/5'}`}
          >
            <Type size={18} />
          </button>
        </div>

        {/* Colores */}
        <div className="flex flex-col gap-2 border-b border-white/5 pb-2">
          {(['#ffffff', '#ff4d4d', '#ffd700'] as ChalkColor[]).map((color) => (
            <button
              key={color}
              onClick={() => onColorChange(color)}
              className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${currentColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {/* Tamaños */}
        <div className="flex flex-col gap-2 border-b border-white/5 pb-2 items-center">
          {([2, 5, 10] as ChalkSize[]).map((size) => (
            <button
              key={size}
              onClick={() => onSizeChange(size)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${currentSize === size ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'}`}
            >
              <div 
                className="rounded-full bg-current" 
                style={{ width: size + 2, height: size + 2 }}
              />
            </button>
          ))}
        </div>

        {/* Acciones */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onUndo}
            className="p-2.5 rounded-xl text-muted-foreground hover:bg-white/5 hover:text-white transition-all"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={onClear}
            className="p-2.5 rounded-xl text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Botón Salir */}
      <button
        onClick={onExit}
        className="bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-200 p-3 rounded-2xl shadow-xl transition-all backdrop-blur-md flex items-center justify-center"
      >
        <X size={20} />
      </button>
    </div>
  );
};

import React from 'react';
import { MousePointer2, Ruler, Pencil, UserPlus, UserMinus, Settings, Layers, Trash2, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  activeTool: 'move' | 'measure' | 'pencil';
  setActiveTool: (tool: 'move' | 'measure' | 'pencil') => void;
  isDM: boolean;
  onOpenScenes: () => void;
  onOpenSettings: () => void;
  onInvokeToken: () => void;
  onResetView: () => void;
  onClearDrawings: () => void;
  hasMyToken: boolean;
}

export function Toolbar({ 
  activeTool, 
  setActiveTool, 
  isDM, 
  onOpenScenes, 
  onOpenSettings, 
  onInvokeToken,
  onResetView,
  onClearDrawings,
  hasMyToken
}: Props) {
  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-30">
      <div className="flex flex-col gap-2 p-2 bg-black/60 backdrop-blur-md border border-[var(--gold)]/30 rounded-xl shadow-2xl">
        <ToolButton 
          active={activeTool === 'move'} 
          onClick={() => setActiveTool('move')}
          icon={<MousePointer2 className="w-5 h-5" />}
          label="Mover"
        />
        <ToolButton 
          active={activeTool === 'measure'} 
          onClick={() => setActiveTool('measure')}
          icon={<Ruler className="w-5 h-5" />}
          label="Regla"
        />
        <ToolButton 
          active={activeTool === 'pencil'} 
          onClick={() => setActiveTool('pencil')}
          icon={<Pencil className="w-5 h-5" />}
          label="Dibujo"
        />
        <ToolButton 
          active={false} 
          onClick={onResetView}
          icon={<Crosshair className="w-5 h-5" />}
          label="Centrar"
          className="border-white/10"
        />
      </div>

      <div className="flex flex-col gap-2 p-2 bg-black/60 backdrop-blur-md border border-[var(--gold)]/30 rounded-xl shadow-2xl">
        <ToolButton 
          active={false} 
          onClick={onClearDrawings}
          icon={<Trash2 className="w-5 h-5 text-red-400" />}
          label="Limpiar Dibujos"
          className="border-red-500/30"
        />
      </div>

      <div className="flex flex-col gap-2 p-2 bg-black/60 backdrop-blur-md border border-[var(--gold)]/30 rounded-xl shadow-2xl">
        <ToolButton 
          active={false}
          onClick={onInvokeToken}
          icon={hasMyToken ? <UserMinus className="w-5 h-5 text-red-400" /> : <UserPlus className="w-5 h-5 text-green-400" />}
          label={hasMyToken ? "Retirar" : "Invocar"}
          className={hasMyToken ? "border-red-500/30" : "border-green-500/30"}
        />
      </div>

      {isDM && (
        <div className="flex flex-col gap-2 p-2 bg-black/60 backdrop-blur-md border border-[var(--gold)]/30 rounded-xl shadow-2xl">
          <ToolButton 
            active={false}
            onClick={onOpenScenes}
            icon={<Layers className="w-5 h-5" />}
            label="Escenas"
          />
          <ToolButton 
            active={false}
            onClick={onOpenSettings}
            icon={<Settings className="w-5 h-5" />}
            label="Config"
          />
        </div>
      )}
    </div>
  );
}

function ToolButton({ 
  active, 
  onClick, 
  icon, 
  label, 
  className 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative group flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-300 border border-transparent",
        active ? "bg-[var(--gold)] text-black border-[var(--gold)] shadow-[0_0_15px_rgba(234,179,8,0.4)]" : "text-[var(--gold)]/70 hover:bg-[var(--gold)]/10 hover:border-[var(--gold)]/40 hover:text-[var(--gold)]",
        className
      )}
      title={label}
    >
      {icon}
      <span className="absolute right-full mr-3 px-2 py-1 bg-black/80 border border-[var(--gold)]/30 rounded text-[10px] uppercase tracking-widest text-[var(--gold)] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
        {label}
      </span>
    </button>
  );
}
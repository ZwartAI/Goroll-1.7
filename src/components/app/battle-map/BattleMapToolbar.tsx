import React from 'react';
import { Ruler, Pencil, UserPlus, UserMinus, MousePointer2, Layers } from 'lucide-react';

interface Props {
  isDM: boolean;
  isChalkMode: boolean;
  chalkTool: 'pencil' | 'note';
  onToggleChalk: () => void;
  onChalkToolChange: (tool: 'pencil' | 'note') => void;
  hasToken: boolean;
  onToggleToken: () => void;
  isRulerActive: boolean;
  onToggleRuler: () => void;
  onScenesToggle: () => void;
}

export const BattleMapToolbar: React.FC<Props> = ({
  isDM,
  isChalkMode,
  chalkTool,
  onToggleChalk,
  onChalkToolChange,
  hasToken,
  onToggleToken,
  isRulerActive,
  onToggleRuler,
  onScenesToggle
}) => {
  return (
    <div className="flex flex-col gap-2 bg-black/80 backdrop-blur-xl border border-white/10 p-2.5 rounded-[2rem] shadow-2xl">
      <ToolbarButton 
        active={!isChalkMode && !isRulerActive} 
        onClick={() => {
          if (isChalkMode) onToggleChalk();
          if (isRulerActive) onToggleRuler();
        }}
        icon={<MousePointer2 className="w-5 h-5" />}
        title="Seleccionar"
      />

      <div className="h-px bg-white/10 mx-1 my-1" />

      <ToolbarButton 
        active={isRulerActive} 
        onClick={onToggleRuler}
        icon={<Ruler className="w-5 h-5" />}
        title="Regla (Distancia)"
      />

      {isDM && (
        <ToolbarButton 
          active={isChalkMode && chalkTool === 'pencil'} 
          onClick={() => {
            if (!isChalkMode) onToggleChalk();
            onChalkToolChange('pencil');
          }}
          icon={<Pencil className="w-5 h-5" />}
          title="Lápiz (Dibujo)"
        />
      )}

      <ToolbarButton 
        active={false} 
        onClick={onScenesToggle}
        icon={<Layers className="w-5 h-5" />}
        title="Escenas/Mapas"
      />

      <div className="h-px bg-white/10 mx-1 my-1" />

      <ToolbarButton 
        active={hasToken} 
        onClick={onToggleToken}
        icon={hasToken ? <UserMinus className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
        title={hasToken ? "Retirar Token" : "Invocar Token"}
        color={hasToken ? "text-red-400" : "text-green-400"}
      />
    </div>
  );
};

const ToolbarButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  color?: string;
}> = ({ active, onClick, icon, title, color }) => (
  <button
    onClick={onClick}
    className={`
      w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group relative
      ${active 
        ? 'bg-[var(--gold)] text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]' 
        : `text-muted-foreground hover:bg-white/5 hover:text-foreground ${color || ''}`}
    `}
    title={title}
  >
    {icon}
    {!active && (
      <div className="absolute left-0 top-0 w-full h-full rounded-xl border border-transparent group-hover:border-white/10 transition-colors" />
    )}
  </button>
);

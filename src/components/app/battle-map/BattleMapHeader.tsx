import React from 'react';
import { Menu, ArrowLeft, Users, HelpCircle, ChevronDown } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  title: string;
  onBack: () => void;
  onMenuToggle: () => void;
  onScenesToggle?: () => void;
  onlineCount?: number;
  isDM?: boolean;
}


export const BattleMapHeader: React.FC<Props> = ({ 
  title, 
  onBack, 
  onMenuToggle, 
  onScenesToggle,
  onlineCount = 0,
  isDM = false
}) => {
  const { t } = useT();

  return (
    <header className="h-14 bg-[#0a0a0c]/90 border-b border-white/10 flex items-center justify-between px-4 z-[60] relative backdrop-blur-md shadow-xl">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2.5 hover:bg-white/5 rounded-xl transition-all text-muted-foreground hover:text-white border border-transparent hover:border-white/10"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="h-8 w-px bg-white/10" />

        <div className="flex flex-col">
          <span className="text-[8px] uppercase tracking-[0.4em] text-muted-foreground font-display leading-none mb-1 opacity-60">
            {isDM ? 'Dungeon Master' : 'Explorador'}
          </span>
          <h1 className="font-display text-[13px] uppercase tracking-[0.15em] text-[var(--gold)] truncate max-w-[150px] sm:max-w-none leading-none font-bold">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuToggle}
          className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-[var(--gold)] border border-white/10 hover:scale-105 active:scale-95"
          title="Menú del Mapa"
        >
          <Menu size={20} />
        </button>
        {/* Indicador de usuarios online */}
        <div className="hidden xs:flex items-center gap-2 px-2 py-1 bg-white/5 rounded-full border border-white/5">
          <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[9px] text-muted-foreground font-medium flex items-center gap-1">
            <Users size={10} />
            {onlineCount}
          </span>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1.5 text-muted-foreground hover:text-[var(--gold)] transition-colors">
                <HelpCircle size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent className="bg-[#1a1a1e] border-white/10 text-[10px] p-2 max-w-[200px]">
              <p className="font-bold mb-1 text-[var(--gold)]">Controles del Mapa</p>
              <ul className="space-y-0.5 text-muted-foreground list-disc list-inside">
                <li>Arrastra para mover el mapa</li>
                <li>Pinch o Rueda para Zoom</li>
                <li>Long-press en token para Proyecciones</li>
                <li>Icono Tiza para dibujar/notas</li>
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="h-8 w-px bg-white/10 mx-1" />
        
        <button
          onClick={onScenesToggle}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-black text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:scale-105 active:scale-95"
        >
          <Layers size={14} />
          {isDM ? 'Escenas' : 'Mapas'}
        </button>
      </div>
    </header>
  );
};

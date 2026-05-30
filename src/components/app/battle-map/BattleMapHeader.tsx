import React from 'react';
import { Menu, ArrowLeft, Users, HelpCircle } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  title: string;
  onBack: () => void;
  onMenuToggle: () => void;
  onlineCount?: number;
}


export const BattleMapHeader: React.FC<Props> = ({ title, onBack, onMenuToggle, onlineCount = 0 }) => {
  const { t } = useT();

  return (
    <header className="h-14 bg-[#0a0a0c] border-b border-border/50 flex items-center justify-between px-3 z-[60] relative shadow-lg">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuToggle}
          className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-[var(--gold)] border border-white/5 shadow-inner"
        >
          <Menu size={20} />
        </button>
        <div className="flex flex-col">
          <span className="text-[8px] uppercase tracking-[0.3em] text-muted-foreground font-display leading-none mb-1">Dungeon Master</span>
          <h1 className="font-display text-xs uppercase tracking-[0.15em] text-[var(--gold)] truncate max-w-[150px] sm:max-w-none leading-none">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Indicador de usuarios online */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5">
            <Users size={12} />
            {onlineCount} {onlineCount === 1 ? 'jugador' : 'jugadores'}
          </span>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-2 text-muted-foreground hover:text-[var(--gold)] transition-colors">
                <HelpCircle size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent className="bg-[#1a1a1e] border-white/10 text-xs p-3 max-w-xs">
              <p className="font-bold mb-1 text-[var(--gold)]">Controles del Mapa</p>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                <li>Arrastra para mover el mapa</li>
                <li>Pinch o Rueda para Zoom</li>
                <li>Long-press en token para Proyecciones</li>
                <li>Icono Tiza para dibujar/notas</li>
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <button
          onClick={onBack}
          className="btn-fantasy !py-1.5 !px-4 !text-[9px] flex items-center gap-2 opacity-80 hover:opacity-100 whitespace-nowrap"
          style={{ background: 'var(--gradient-gold)', color: 'black' }}
        >
          <ArrowLeft size={14} />
          {t('battleMap.backToScene')}
        </button>
      </div>
    </header>
  );
};

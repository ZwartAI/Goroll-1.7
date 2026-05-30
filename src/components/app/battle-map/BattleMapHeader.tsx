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
    <header className="h-12 bg-[#0a0a0c] border-b border-white/10 flex items-center justify-between px-3 z-[60] relative shadow-lg">
      <div className="flex items-center gap-2">
        <button 
          onClick={onMenuToggle}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-[var(--gold)] border border-white/5"
        >
          <Menu size={18} />
        </button>
        <div className="flex flex-col">
          <span className="text-[7px] uppercase tracking-[0.3em] text-muted-foreground font-display leading-none mb-0.5">
            {isDM ? 'Dungeon Master' : 'Explorador'}
          </span>
          <button 
            onClick={onScenesToggle}
            className="flex items-center gap-1.5 group outline-none"
          >
            <h1 className="font-display text-[11px] uppercase tracking-[0.1em] text-[var(--gold)] truncate max-w-[120px] sm:max-w-none leading-none group-hover:text-white transition-colors">
              {title}
            </h1>
            {isDM && <ChevronDown size={12} className="text-[var(--gold)] opacity-50 group-hover:opacity-100" />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
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

        <button
          onClick={onBack}
          className="btn-fantasy !py-1 !px-3 !text-[8px] flex items-center gap-1.5 opacity-90 hover:opacity-100 whitespace-nowrap"
          style={{ background: 'var(--gradient-gold)', color: 'black' }}
        >
          <ArrowLeft size={12} />
          {t('battleMap.exit')}
        </button>
      </div>
    </header>
  );
};

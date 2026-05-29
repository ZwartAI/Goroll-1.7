import React from 'react';
import { Menu, ArrowLeft, ScrollText } from 'lucide-react';
import { useT } from '@/lib/i18n';

interface Props {
  title: string;
  onBack: () => void;
  onMenuToggle: () => void;
}


export const BattleMapHeader: React.FC<Props> = ({ title, onBack, onMenuToggle }) => {
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

      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="btn-fantasy !py-1.5 !px-4 !text-[9px] flex items-center gap-2 opacity-80 hover:opacity-100"
          style={{ background: 'var(--gradient-gold)', color: 'black' }}
        >
          <ArrowLeft size={14} />
          {t('battleMap.backToScene')}
        </button>
      </div>
    </header>
  );
};

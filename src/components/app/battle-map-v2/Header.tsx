import React from 'react';
import { ChevronLeft, Menu } from 'lucide-react';
import { useT } from '@/lib/i18n';

interface Props {
  onBack: () => void;
  isDM: boolean;
  campaignName: string;
}

export function Header({ onBack, isDM, campaignName }: Props) {
  const { t } = useT();

  return (
    <header className="h-14 bg-black/80 border-b border-[var(--gold)]/30 px-4 flex items-center justify-between z-20 shadow-[0_4px_10px_rgba(0,0,0,0.5)]" data-map-ui="true">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-white/10 rounded-full transition-colors group"
        >
          <ChevronLeft className="w-6 h-6 text-[var(--gold)] group-hover:-translate-x-0.5 transition-transform" />
        </button>
        <div className="h-6 w-px bg-[var(--gold)]/20 mx-1" />
        <span className="font-display text-xs uppercase tracking-[0.2em] text-[var(--gold)]/70 hidden sm:inline">
          GoRoll Battle Map
        </span>
      </div>

      <div className="flex flex-col items-center">
        <h1 className="font-display text-[10px] sm:text-xs uppercase tracking-[0.3em] text-[var(--gold)] text-center leading-none mb-1">
          {isDM ? 'Dungeon Master' : 'Jugador'}
        </h1>
        <p className="text-[9px] uppercase tracking-wider text-white/50 font-medium">
          {campaignName}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-[var(--gold)]">
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}

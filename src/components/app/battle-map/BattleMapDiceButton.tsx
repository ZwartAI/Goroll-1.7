import React from 'react';
import { Box } from 'lucide-react';

interface Props {
  onClick: () => void;
}

export const BattleMapDiceButton: React.FC<Props> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-12 h-12 bg-black rounded-2xl border border-[var(--gold)]/50 flex items-center justify-center text-white shadow-[0_0_15px_rgba(234,179,8,0.2)] hover:scale-110 active:scale-95 transition-all group relative"

      aria-label="Roll Dice"
    >
      <Box className="w-7 h-7 group-hover:rotate-12 transition-transform" />
      
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full bg-[var(--gold)]/20 animate-pulse" />
    </button>
  );
};

import React from 'react';
import { Box } from 'lucide-react';

interface Props {
  onClick: () => void;
}

export const BattleMapDiceButton: React.FC<Props> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="absolute bottom-6 left-6 w-14 h-14 bg-black rounded-full border-2 border-[var(--gold)] flex items-center justify-center text-white shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:scale-110 active:scale-95 transition-all z-30 group"
      aria-label="Roll Dice"
    >
      <Box className="w-7 h-7 group-hover:rotate-12 transition-transform" />
      
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full bg-[var(--gold)]/20 animate-pulse" />
    </button>
  );
};

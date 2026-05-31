import React from 'react';
import { Box } from 'lucide-react';

interface Props {
  onClick: () => void;
}

export const DiceButton: React.FC<Props> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-11 h-11 bg-[#0a0a0c]/90 rounded-full border border-[var(--gold)]/40 flex items-center justify-center text-[var(--gold)] shadow-[0_5px_15px_rgba(0,0,0,0.5),0_0_10px_rgba(234,179,8,0.1)] hover:scale-110 hover:border-[var(--gold)] active:scale-95 transition-all group relative backdrop-blur-md"
      aria-label="Tirar Dados"
    >
      <Box className="w-5 h-5 group-hover:rotate-12 transition-transform" />
      
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full bg-[var(--gold)]/5 animate-pulse" />
    </button>
  );
};

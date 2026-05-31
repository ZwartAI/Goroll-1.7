import React from 'react';
import { useT } from '@/lib/i18n';
import { Map as MapIcon, X } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export const BattleMapDisabledPlaceholder: React.FC<Props> = ({ onBack }) => {
  const { t, locale } = useT();
  
  const isEn = locale === 'en';
  
  return (
    <div className="fixed inset-0 z-[110] bg-black/95 flex flex-col items-center justify-center p-6 text-center">
      <div className="relative w-24 h-24 mb-6">
        <MapIcon className="w-full h-full text-muted-foreground opacity-20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <X className="w-16 h-16 text-red-500/50" />
        </div>
      </div>
      
      <h2 className="font-display text-2xl uppercase tracking-[0.2em] text-[var(--gold)] mb-4">
        {isEn ? "Battle Map disabled" : "Battle Map desactivado"}
      </h2>
      
      <p className="max-w-md text-muted-foreground mb-8 leading-relaxed">
        {isEn 
          ? "The Battle Map is temporarily disabled while it is being redesigned." 
          : "El Battle Map está desactivado temporalmente mientras se rediseña."}
      </p>
      
      <button 
        onClick={onBack}
        className="btn-fantasy px-10 py-3"
      >
        {isEn ? "Back to scene" : "Volver a escena"}
      </button>
    </div>
  );
};

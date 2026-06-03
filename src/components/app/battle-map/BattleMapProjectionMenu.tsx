import React, { useRef, useEffect } from 'react';
import { Ruler, Circle, Minus, Triangle } from 'lucide-react';

interface Props {
  x: number;
  y: number;
  onSelect: (type: 'distance' | 'area' | 'line' | 'cone') => void;
  onClose: () => void;
}

export const BattleMapProjectionMenu: React.FC<Props> = ({ x, y, onSelect, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const options = [
    { id: 'distance', icon: Ruler, label: 'Distancia' },
    { id: 'area', icon: Circle, label: 'Área' },
    { id: 'line', icon: Minus, label: 'Línea' },
    { id: 'cone', icon: Triangle, label: 'Cono' },
  ] as const;

  return (
    <div 
      ref={menuRef}
      className="fixed z-[200] flex gap-2 p-2 bg-black/80 backdrop-blur-md border border-[var(--gold)]/30 rounded-2xl shadow-[0_0_20px_rgba(234,179,8,0.2)] animate-in zoom-in-95 fade-in duration-200"
      style={{ left: x, top: y, transform: 'translate(-50%, -120%)' }}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(opt.id);
          }}
          className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-[var(--gold)]/20 transition-colors group"
        >
          <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-lg border border-white/10 group-hover:border-[var(--gold)]/50 transition-all">
            <opt.icon size={20} className="text-[var(--gold)] group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-[8px] uppercase tracking-widest text-muted-foreground group-hover:text-[var(--gold)]">
            {opt.label}
          </span>
        </button>
      ))}
    </div>
  );
};

import React, { useState } from 'react';
import { Minus, Plus, X, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

// FASE 8: Compact Dice Selection Interface
export type DieType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

export interface DieSelection {
  type: DieType;
  count: number;
  enabled: boolean;
  label: string;
}

interface Props {
  onClose: () => void;
  onRoll: (selections: DieSelection[]) => void;
}

const INITIAL_DICE: DieSelection[] = [
  { type: 'd4', count: 1, enabled: false, label: 'd4' },
  { type: 'd6', count: 1, enabled: false, label: 'd6' },
  { type: 'd8', count: 1, enabled: false, label: 'd8' },
  { type: 'd10', count: 1, enabled: false, label: 'd10' },
  { type: 'd12', count: 1, enabled: false, label: 'd12' },
  { type: 'd20', count: 1, enabled: true, label: 'd20' },
  { type: 'd100', count: 1, enabled: false, label: 'd100' },
];

export const BattleMapDicePanel: React.FC<Props> = ({ onClose, onRoll }) => {
  const [dice, setDice] = useState<DieSelection[]>(INITIAL_DICE);

  const updateDice = (type: DieType, updates: Partial<DieSelection>) => {
    setDice(prev => prev.map(d => d.type === type ? { ...d, ...updates } : d));
  };

  const handleRoll = () => {
    const selected = dice.filter(d => d.enabled && d.count > 0);
    if (selected.length > 0) {
      onRoll(selected);
    }
  };

  return (
    <div className="absolute inset-x-0 bottom-16 z-[80] animate-in slide-in-from-bottom-5 duration-300 pointer-events-none">
      <div className="mx-auto max-w-sm w-[95%] bg-[#0a0a0c]/95 border border-white/10 rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-xl pointer-events-auto overflow-hidden">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="font-display text-[10px] uppercase tracking-widest text-[var(--gold)]">
            Tirada Rápida
          </h2>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {dice.map((die) => (
            <div 
              key={die.type}
              className={`flex items-center justify-between px-2 py-1.5 rounded-xl border transition-all ${die.enabled ? 'bg-[var(--gold)]/10 border-[var(--gold)]/30' : 'bg-white/5 border-white/5 opacity-80'}`}
            >
              <div className="flex items-center gap-2 flex-1">
                <Checkbox 
                  id={`check-${die.type}`}
                  checked={die.enabled}
                  onCheckedChange={(checked) => updateDice(die.type, { enabled: !!checked })}
                  className="w-4 h-4 border-white/30 data-[state=checked]:bg-[var(--gold)] data-[state=checked]:text-black"
                />
                <span className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">{die.label}</span>
              </div>

              <div className="flex items-center gap-1.5 bg-black/40 rounded-lg p-0.5 border border-white/5">
                <button 
                  onClick={() => updateDice(die.type, { count: Math.max(1, die.count - 1) })}
                  className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-white"
                >
                  <Minus size={10} />
                </button>
                <span className="w-5 text-center text-[10px] font-bold text-[var(--gold)]">{die.count}</span>
                <button 
                  onClick={() => updateDice(die.type, { count: die.count + 1 })}
                  className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-white"
                >
                  <Plus size={10} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <Button 
          className="w-full h-10 rounded-xl bg-[var(--gold)] text-black font-bold text-[10px] tracking-[0.2em] shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all"
          onClick={handleRoll}
        >
          <Play size={12} className="mr-2 fill-current" />
          LANZAR DADOS
        </Button>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

// FASE 6: Dice Selection Interface
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
    <div className="absolute inset-x-0 bottom-0 z-[70] animate-in slide-in-from-bottom duration-300">
      <div className="mx-auto max-w-md bg-[#0a0a0c]/95 border-t border-white/20 rounded-t-[2.5rem] p-6 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-lg uppercase tracking-widest text-[var(--gold)]">
            Tirada de Dados
          </h2>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3 mb-8 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
          {dice.map((die) => (
            <div 
              key={die.type}
              className={`flex items-center gap-4 p-3 rounded-2xl border transition-all ${die.enabled ? 'bg-[var(--gold)]/10 border-[var(--gold)]/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'bg-white/5 border-white/5 opacity-60'}`}
            >
              <Checkbox 
                id={`check-${die.type}`}
                checked={die.enabled}
                onCheckedChange={(checked) => updateDice(die.type, { enabled: !!checked })}
                className="border-white/30 data-[state=checked]:bg-[var(--gold)] data-[state=checked]:text-black"
              />
              
              <label 
                htmlFor={`check-${die.type}`}
                className="flex-1 flex items-center gap-3 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center border border-white/10">
                  <span className="font-display text-sm text-[var(--gold)] font-bold">{die.label}</span>
                </div>
                <span className="font-display text-sm uppercase tracking-wider">{die.label}</span>
              </label>

              <div className="flex items-center gap-2 bg-black/40 rounded-xl p-1 border border-white/10">
                <button 
                  onClick={() => updateDice(die.type, { count: Math.max(1, die.count - 1) })}
                  className="p-1.5 text-muted-foreground hover:text-white transition-colors"
                >
                  <Minus size={14} />
                </button>
                <Input 
                  type="number"
                  value={die.count}
                  onChange={(e) => updateDice(die.type, { count: parseInt(e.target.value) || 1 })}
                  className="w-10 h-8 p-0 text-center bg-transparent border-none text-sm font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button 
                  onClick={() => updateDice(die.type, { count: die.count + 1 })}
                  className="p-1.5 text-muted-foreground hover:text-white transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <Button 
            variant="outline" 
            className="flex-1 h-14 rounded-2xl border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
            onClick={onClose}
          >
            CANCELAR
          </Button>
          <Button 
            className="flex-1 h-14 rounded-2xl bg-[var(--gold)] text-black font-bold tracking-[0.2em] shadow-[0_0_25px_rgba(234,179,8,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            onClick={handleRoll}
          >
            TIRAR
          </Button>
        </div>
      </div>
    </div>
  );
};

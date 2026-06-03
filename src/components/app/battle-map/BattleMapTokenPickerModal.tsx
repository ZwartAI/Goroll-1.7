import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Check, Sword, Users, UserRound } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { backdropProps } from '@/lib/modalBackdrop';
import { listTemplates, type EnemyTemplate } from '@/lib/bestiary';
import { listNpcTemplates, type NpcTemplate } from '@/lib/npcs';
import { EnemyIcon, getEnemyCustomImage, getEnemyAssetUrl } from '@/components/app/EnemyIconPicker';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  onSummon: (tokens: Array<{ id: string, name: string, color: string, icon: string, type: 'enemy' | 'npc' | 'player' }>) => void;
}

type Tab = 'enemies' | 'npcs';

export const BattleMapTokenPickerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  campaignId,
  onSummon
}) => {
  const { t } = useT();
  const [activeTab, setActiveTab] = useState<Tab>('enemies');
  const [query, setQuery] = useState('');
  const [enemies, setEnemies] = useState<EnemyTemplate[]>([]);
  const [npcs, setNpcs] = useState<NpcTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    
    setLoading(true);
    Promise.all([
      listTemplates(campaignId),
      listNpcTemplates(campaignId)
    ]).then(([enemiesData, npcsData]) => {
      setEnemies(enemiesData);
      setNpcs(npcsData);
      setLoading(false);
    });
  }, [isOpen, campaignId]);

  const filteredEnemies = useMemo(() => {
    return enemies.filter(e => e.name.toLowerCase().includes(query.toLowerCase()));
  }, [enemies, query]);

  const filteredNpcs = useMemo(() => {
    return npcs.filter(n => n.name.toLowerCase().includes(query.toLowerCase()));
  }, [npcs, query]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleConfirm = () => {
    const tokens: any[] = [];
    
    selectedIds.forEach(id => {
      const enemy = enemies.find(e => e.id === id);
      if (enemy) {
        tokens.push({
          id: enemy.id,
          name: enemy.name,
          color: enemy.color || '#ef4444',
          icon: enemy.icon_key,
          type: 'enemy'
        });
      }
      
      const npc = npcs.find(n => n.id === id);
      if (npc) {
        tokens.push({
          id: npc.id,
          name: npc.name,
          color: npc.color || '#ffffff',
          icon: npc.icon_key,
          type: 'npc'
        });
      }
    });
    
    onSummon(tokens);
    onClose();
    setSelectedIds(new Set());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" {...backdropProps(onClose)}>
      <div className="ornate-card w-full max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex flex-col">
            <h2 className="font-display text-xs uppercase tracking-[0.3em] text-[var(--gold)]">
              Seleccionar Tokens
            </h2>
            <span className="text-[8px] text-muted-foreground uppercase tracking-widest mt-1">Elige los elementos para invocar al mapa</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 bg-black/20">
          <TabButton 
            active={activeTab === 'enemies'} 
            onClick={() => setActiveTab('enemies')} 
            icon={<Sword size={14} />} 
            label="Bestiario" 
          />
          <TabButton 
            active={activeTab === 'npcs'} 
            onClick={() => setActiveTab('npcs')} 
            icon={<UserRound size={14} />} 
            label="NPCs" 
          />
        </div>

        {/* Search */}
        <div className="p-3 bg-black/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input 
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[var(--gold)]/50 transition-colors"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-30 gap-3">
              <div className="w-6 h-6 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] uppercase tracking-widest">Cargando tokens...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(activeTab === 'enemies' ? filteredEnemies : filteredNpcs).map(item => {
                const isSelected = selectedIds.has(item.id);
                const customImg = getEnemyCustomImage(item as any);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleSelect(item.id)}
                    className={`
                      ornate-card !p-2 flex items-center gap-3 transition-all text-left relative overflow-hidden group
                      ${isSelected ? 'bg-[var(--gold)]/10 border-[var(--gold)]/40 ring-1 ring-[var(--gold)]/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'bg-white/5 border-transparent hover:bg-white/10'}
                    `}
                  >
                    <div className={`w-10 h-10 rounded-full border shrink-0 flex items-center justify-center bg-black overflow-hidden relative ${isSelected ? 'border-[var(--gold)]' : 'border-white/10'}`} style={{ color: item.color }}>
                      <EnemyIcon name={item.icon_key} size={24} fill={true} customImage={customImg} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-display uppercase tracking-wider truncate ${isSelected ? 'text-white' : 'text-muted-foreground'}`}>
                        {item.name}
                      </p>
                      <p className="text-[9px] text-muted-foreground/60 uppercase tracking-widest mt-0.5">
                        {activeTab === 'enemies' ? 'Enemigo' : 'NPC'}
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[var(--gold)] border-[var(--gold)]' : 'border-white/10'}`}>
                      {isSelected && <Check size={12} className="text-black" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between gap-4">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {selectedIds.size} seleccionados
          </span>
          <div className="flex gap-2">
            <button 
              onClick={onClose}
              className="px-6 py-2 rounded-xl border border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className="px-6 py-2 rounded-xl bg-[var(--gold)] text-black text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--gold)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)]"
            >
              Invocar ({selectedIds.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-bold uppercase tracking-widest transition-all relative ${
      active ? 'text-[var(--gold)] bg-white/5' : 'text-muted-foreground hover:bg-white/5'
    }`}
  >
    {icon}
    {label}
    {active && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[var(--gold)]" />}
  </button>
);
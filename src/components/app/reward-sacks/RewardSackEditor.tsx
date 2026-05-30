import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n";
import { Save, X, Plus, Coins, Sword, Sparkles, Wand2, Dice5, Trash2 } from "lucide-react";
import { type RewardSack, type RewardSackType, saveRewardSack, SACK_TYPE_COLORS } from "@/lib/rewards";
import { toast } from "sonner";
import { ResourcePickerModal } from "./ResourcePickerModal";
import { backdropProps } from "@/lib/modalBackdrop";

interface Props {
  campaignId: string;
  sack?: RewardSack;
  onClose: () => void;
  onSaved: () => void;
}

export function RewardSackEditor({ campaignId, sack, onClose, onSaved }: Props) {
  const { t } = useT();
  const [name, setName] = useState(sack?.name || "");
  const [type, setType] = useState<RewardSackType>(sack?.type || "normal");
  const [hasCoins, setHasCoins] = useState(sack?.has_coins ?? false);
  const [coinsMin, setCoinsMin] = useState(sack?.coins_min ?? 10);
  const [coinsMax, setCoinsMax] = useState(sack?.coins_max ?? 50);
  const [hasItems, setHasItems] = useState(sack?.has_items ?? false);
  const [hasBoosters, setHasBoosters] = useState(sack?.has_boosters ?? false);
  const [hasSpecialItems, setHasSpecialItems] = useState(sack?.has_special_items ?? false);
  const [randomBalanced, setRandomBalanced] = useState(sack?.random_balanced ?? true);
  
  const [manualItemIds, setManualItemIds] = useState<string[]>(sack?.manual_item_ids || []);
  const [manualSkillIds, setManualSkillIds] = useState<string[]>(sack?.manual_skill_ids || []);
  const [manualBoosterIds, setManualBoosterIds] = useState<string[]>(sack?.manual_booster_ids || []);

  const [pickerType, setPickerType] = useState<'item' | 'skill' | 'booster' | null>(null);

  const handleSave = async () => {
    if (!name.trim()) return toast.error("El nombre es obligatorio");
    if (hasCoins && coinsMin > coinsMax) return toast.error("El rango de monedas no es válido");

    try {
      await saveRewardSack({
        id: sack?.id,
        campaign_id: campaignId,
        name: name.trim(),
        type,
        has_coins: hasCoins,
        coins_min: coinsMin,
        coins_max: coinsMax,
        has_items: hasItems,
        has_boosters: hasBoosters,
        has_special_items: hasSpecialItems,
        random_balanced: randomBalanced,
        manual_item_ids: manualItemIds,
        manual_skill_ids: manualSkillIds,
        manual_booster_ids: manualBoosterIds,
      });
      toast.success(sack ? "Saco actualizado" : "Saco creado");
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm" {...backdropProps(onClose)}>
      <div className="ornate-card w-full max-w-2xl bg-[#0d0d0d] flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        <header className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-display text-lg text-[var(--gold)] uppercase tracking-widest">
            {sack ? "Editar Saco" : "Nuevo Saco de Recompensa"}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-white"><X size={24} /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* General Config */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Nombre del Saco</label>
              <input 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Tesoro del Goblin"
                className="w-full bg-black/40 border border-white/10 rounded-md py-2 px-3 text-sm focus:border-[var(--gold)] outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Tipo de Recompensa</label>
              <div className="flex gap-2">
                {(['normal', 'special', 'legendary'] as RewardSackType[]).map(t => (
                  <button 
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex-1 py-2 rounded text-[10px] uppercase font-bold tracking-widest transition-all border ${type === t ? 'bg-white/10 border-white/40' : 'bg-black/40 border-transparent opacity-60'}`}
                    style={{ color: SACK_TYPE_COLORS[t] }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Possible Content */}
          <div className="space-y-4">
            <h4 className="font-display text-xs uppercase tracking-widest text-[var(--gold)] border-b border-white/5 pb-1">Contenido Posible</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Monedas */}
              <div className={`p-4 rounded-xl border transition-all ${hasCoins ? 'bg-[var(--gold)]/5 border-[var(--gold)]/20' : 'bg-black/40 border-white/5 opacity-60'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Coins className="text-[var(--gold)] w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Monedas</span>
                  </div>
                  <input type="checkbox" checked={hasCoins} onChange={e => setHasCoins(e.target.checked)} className="accent-[var(--gold)]" />
                </div>
                {hasCoins && (
                  <div className="flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex-1 space-y-1">
                      <label className="text-[9px] uppercase text-muted-foreground">Min</label>
                      <input type="number" value={coinsMin} onChange={e => setCoinsMin(+e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[9px] uppercase text-muted-foreground">Max</label>
                      <input type="number" value={coinsMax} onChange={e => setCoinsMax(+e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs" />
                    </div>
                  </div>
                )}
              </div>

              {/* Equipamiento */}
              <div className={`p-4 rounded-xl border transition-all ${hasItems ? 'bg-blue-500/5 border-blue-500/20' : 'bg-black/40 border-white/5 opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sword className="text-blue-400 w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Equipamiento</span>
                  </div>
                  <input type="checkbox" checked={hasItems} onChange={e => setHasItems(e.target.checked)} className="accent-blue-400" />
                </div>
                <p className="text-[9px] text-muted-foreground mt-2">Armas, armaduras y accesorios.</p>
              </div>

              {/* Boosters */}
              <div className={`p-4 rounded-xl border transition-all ${hasBoosters ? 'bg-purple-500/5 border-purple-500/20' : 'bg-black/40 border-white/5 opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-purple-400 w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Potenciadores</span>
                  </div>
                  <input type="checkbox" checked={hasBoosters} onChange={e => setHasBoosters(e.target.checked)} className="accent-purple-400" />
                </div>
                <p className="text-[9px] text-muted-foreground mt-2">Boosters de stats y efectos temporales.</p>
              </div>

              {/* Especiales */}
              <div className={`p-4 rounded-xl border transition-all ${hasSpecialItems ? 'bg-[var(--rarity-gold)]/5 border-[var(--rarity-gold)]/20' : 'bg-black/40 border-white/5 opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wand2 className="text-[var(--rarity-gold)] w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Ítems Únicos</span>
                  </div>
                  <input type="checkbox" checked={hasSpecialItems} onChange={e => setHasSpecialItems(e.target.checked)} className="accent-[var(--rarity-gold)]" />
                </div>
                <p className="text-[9px] text-muted-foreground mt-2">Objetos de misión o legendarios.</p>
              </div>

            </div>
          </div>

          {/* Random Config */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <Dice5 className="text-[var(--gold)] w-5 h-5" />
               <div>
                 <p className="text-xs font-bold uppercase tracking-wider">Generación Aleatoria Balanceada</p>
                 <p className="text-[9px] text-muted-foreground">Toma objetos de la pool según rareza del saco.</p>
               </div>
             </div>
             <input 
              type="checkbox" 
              checked={randomBalanced} 
              onChange={e => setRandomBalanced(e.target.checked)} 
              className="accent-[var(--gold)] w-5 h-5" 
            />
          </div>

          {/* Manual Selection */}
          <div className="space-y-3">
            <h4 className="font-display text-xs uppercase tracking-widest text-muted-foreground border-b border-white/5 pb-1">Selección Manual (Garantizados)</h4>
            
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setPickerType('item')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-[10px] uppercase font-bold transition-colors border border-white/10"
              >
                <Plus size={12} /> {manualItemIds.length > 0 ? `${manualItemIds.length} Objetos` : "Añadir Objetos"}
              </button>
              <button 
                onClick={() => setPickerType('skill')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-[10px] uppercase font-bold transition-colors border border-white/10"
              >
                <Plus size={12} /> {manualSkillIds.length > 0 ? `${manualSkillIds.length} Skills` : "Añadir Skills"}
              </button>
              <button 
                onClick={() => setPickerType('booster')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-[10px] uppercase font-bold transition-colors border border-white/10"
              >
                <Plus size={12} /> {manualBoosterIds.length > 0 ? `${manualBoosterIds.length} Boosters` : "Añadir Boosters"}
              </button>
            </div>
          </div>

        </div>

        <footer className="p-4 border-t border-white/10 flex justify-between bg-black/40">
           <button 
            onClick={onClose}
            className="px-6 py-2 text-xs uppercase font-bold tracking-widest text-muted-foreground hover:text-white transition-colors"
           >
             Cancelar
           </button>
           <button 
            onClick={handleSave}
            className="btn-fantasy flex items-center gap-2 px-10 py-2 bg-[var(--gold)] text-black font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(234,179,8,0.2)]"
            style={{ background: "var(--gradient-gold)" }}
           >
             <Save size={18} /> {sack ? "Actualizar Saco" : "Guardar Saco"}
           </button>
        </footer>

        {/* Resource Pickers */}
        {pickerType === 'item' && (
          <ResourcePickerModal 
            title="Seleccionar Objetos" 
            type="item" 
            campaignId={campaignId}
            selectedIds={manualItemIds}
            onClose={() => setPickerType(null)}
            onSelect={(ids) => { setManualItemIds(ids); setPickerType(null); }}
          />
        )}
        {pickerType === 'skill' && (
          <ResourcePickerModal 
            title="Seleccionar Skills" 
            type="skill" 
            campaignId={campaignId}
            selectedIds={manualSkillIds}
            onClose={() => setPickerType(null)}
            onSelect={(ids) => { setManualSkillIds(ids); setPickerType(null); }}
          />
        )}
        {pickerType === 'booster' && (
          <ResourcePickerModal 
            title="Seleccionar Boosters" 
            type="booster" 
            campaignId={campaignId}
            selectedIds={manualBoosterIds}
            onClose={() => setPickerType(null)}
            onSelect={(ids) => { setManualBoosterIds(ids); setPickerType(null); }}
          />
        )}
      </div>
    </div>
  );
}

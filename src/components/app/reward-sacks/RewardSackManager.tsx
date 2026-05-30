import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { Plus, Boxes, Copy, Trash2, Play, Search, Gift, X, Send } from "lucide-react";
import { 
  type RewardSack, 
  fetchRewardSacks, 
  duplicateRewardSack, 
  deleteRewardSack, 
  SACK_TYPE_COLORS 
} from "@/lib/rewards";
import { toast } from "sonner";
import { RewardSackEditor } from "./RewardSackEditor";
import { RewardSackSimulator } from "./RewardSackSimulator";
import { RewardSackAssigner } from "./RewardSackAssigner";
import { backdropProps } from "@/lib/modalBackdrop";


interface Props {
  campaignId: string;
  onClose: () => void;
}

export function RewardSackManager({ campaignId, onClose }: Props) {
  const { t } = useT();
  const [sacks, setSacks] = useState<RewardSack[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSack, setEditingSack] = useState<RewardSack | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [assigningSack, setAssigningSack] = useState<RewardSack | null>(null);
  const [simulatingSack, setSimulatingSack] = useState<RewardSack | null>(null);

  const [search, setSearch] = useState("");

  const reload = async () => {
    setLoading(true);
    try {
      const data = await fetchRewardSacks(campaignId);
      setSacks(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [campaignId]);

  const handleDuplicate = async (sack: RewardSack) => {
    try {
      await duplicateRewardSack(sack);
      toast.success("Saco duplicado");
      reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este saco?")) return;
    try {
      await deleteRewardSack(id);
      toast.success("Saco eliminado");
      reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filteredSacks = sacks.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" {...backdropProps(onClose)}>
      <div className="ornate-card w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#0d0d0d]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <header className="p-4 border-b border-[var(--gold)]/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gift className="text-[var(--gold)] w-6 h-6" />
            <h2 className="font-display text-xl uppercase tracking-widest text-[var(--gold)]">
              Sacos de Recompensa
            </h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
            <X size={24} />
          </button>

        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar saco..."
                className="w-full bg-black/40 border border-white/10 rounded-md py-2 pl-10 pr-4 text-sm focus:border-[var(--gold)] outline-none transition-colors"
              />
            </div>
            <button 
              onClick={() => setIsCreating(true)}
              className="btn-fantasy flex items-center gap-2 px-6 py-2 bg-[var(--gold)] text-black font-bold uppercase tracking-widest"
              style={{ background: "var(--gradient-gold)" }}
            >
              <Plus size={18} /> Nuevo Saco
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--gold)]" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSacks.map(sack => (
                <div 
                  key={sack.id} 
                  className="ornate-card p-4 space-y-4 bg-black/20 hover:bg-black/40 transition-colors group relative border-white/5"
                  style={{ borderColor: `${SACK_TYPE_COLORS[sack.type]}44` }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-display text-sm uppercase tracking-wider line-clamp-1" style={{ color: SACK_TYPE_COLORS[sack.type] }}>
                        {sack.name}
                      </h3>
                      <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
                        Tipo: {sack.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDuplicate(sack)} className="p-1.5 hover:text-[var(--gold)] transition-colors" title="Duplicar">
                        <Copy size={14} />
                      </button>
                      <button onClick={() => handleDelete(sack.id)} className="p-1.5 hover:text-[var(--loss)] transition-colors" title="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div 
                      className="w-16 h-16 rounded-lg bg-black/60 flex items-center justify-center border border-white/10 shadow-inner"
                      style={{ boxShadow: `inset 0 0 10px ${SACK_TYPE_COLORS[sack.type]}22` }}
                    >
                      <Gift size={32} style={{ color: SACK_TYPE_COLORS[sack.type], filter: `drop-shadow(0 0 5px ${SACK_TYPE_COLORS[sack.type]}44)` }} />
                    </div>
                    <div className="flex-1 space-y-1 text-[10px] text-muted-foreground">
                      {sack.has_coins && <p>💰 {sack.coins_min}-{sack.coins_max} Monedas</p>}
                      {sack.has_items && <p>⚔️ Equipamiento</p>}
                      {sack.has_boosters && <p>✨ Potenciadores</p>}
                      {sack.has_special_items && <p>💎 Especiales</p>}
                      {!sack.has_coins && !sack.has_items && !sack.has_boosters && !sack.has_special_items && (
                         <p className="italic">Sin contenido configurado</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    <button 
                      onClick={() => setAssigningSack(sack)}
                      className="flex-1 py-1.5 rounded bg-[var(--gold)] text-black text-[10px] uppercase font-bold tracking-widest hover:scale-105 transition-all shadow-[0_0_10px_rgba(234,179,8,0.2)]"
                    >
                      Entregar
                    </button>
                    <button 
                      onClick={() => setEditingSack(sack)}
                      className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-white transition-colors"
                      title="Editar configuración"
                    >
                      <Plus size={14} className="scale-90 opacity-70" />
                    </button>


                    <button 
                      onClick={() => setSimulatingSack(sack)}
                      className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-white transition-colors"
                      title="Probar simulador"
                    >
                      <Play size={14} />
                    </button>
                  </div>

                </div>
              ))}
              {filteredSacks.length === 0 && !loading && (
                <div className="col-span-full py-20 text-center space-y-2 opacity-50">
                  <Boxes className="mx-auto w-12 h-12" />
                  <p className="text-sm">No hay sacos de recompensa creados.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create / Edit Modal Overlays */}
        {(isCreating || editingSack) && (
          <RewardSackEditor 
            campaignId={campaignId}
            sack={editingSack ?? undefined}
            onClose={() => {
              setIsCreating(false);
              setEditingSack(null);
            }}
            onSaved={() => {
              setIsCreating(false);
              setEditingSack(null);
              reload();
            }}
          />
        )}

        {simulatingSack && (
          <RewardSackSimulator 
            sack={simulatingSack} 
            onClose={() => setSimulatingSack(null)} 
          />
        )}

        {assigningSack && (
          <RewardSackAssigner 
            sack={assigningSack} 
            onClose={() => setAssigningSack(null)} 
          />
        )}

      </div>
    </div>
  );
}


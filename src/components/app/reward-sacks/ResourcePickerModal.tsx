import { useState, useEffect, useMemo } from "react";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Search, X, Check } from "lucide-react";
import { backdropProps } from "@/lib/modalBackdrop";
import { type Rarity, RARITY_COLOR } from "@/lib/game";

type ResourceType = 'item' | 'skill' | 'booster';

interface Resource {
  id: string;
  name: string;
  rarity?: string;
  type?: string;
  image_url?: string;
}

interface Props {
  title: string;
  type: ResourceType;
  campaignId: string;
  selectedIds: string[];
  onClose: () => void;
  onSelect: (ids: string[]) => void;
}

export function ResourcePickerModal({ title, type, campaignId, selectedIds, onClose, onSelect }: Props) {
  const { t } = useT();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tempSelected, setTempSelected] = useState<string[]>(selectedIds);

  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      let query: any;
      if (type === 'item') {
        query = supabase.from("items")
          .select("id, name, rarity, category, image_url")
          .eq("campaign_id", campaignId)
          .eq("in_dm_vault", true);
      } else if (type === 'skill') {
        query = supabase.from("skill_templates")
          .select("id, name, rarity, type")
          .eq("campaign_id", campaignId);
      } else if (type === 'booster') {
        query = supabase.from("boosters")
          .select("id, name, rarity")
          .eq("campaign_id", campaignId)
          .is("owner_character_id", null);
      }

      const { data, error } = await query.order("name");
      if (!error) setResources(data || []);
      setLoading(false);
    };

    fetchResources();
  }, [type, campaignId]);

  const filtered = resources.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    if (tempSelected.includes(id)) {
      setTempSelected(tempSelected.filter(x => x !== id));
    } else {
      setTempSelected([...tempSelected, id]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm" {...backdropProps(onClose)}>
      <div className="ornate-card w-full max-w-md bg-[#0d0d0d] flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-display text-[var(--gold)]">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-white"><X size={20} /></button>
        </header>

        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("common.search")}
              className="w-full bg-black/40 border border-white/10 rounded-md py-2 pl-10 pr-4 text-sm outline-none focus:border-[var(--gold)]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="py-10 text-center animate-pulse text-muted-foreground text-xs">{t("common.loading")}</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-xs">{t("common.noResults") || "No se encontraron resultados"}</div>
          ) : (
            filtered.map(r => {
              const isSelected = tempSelected.includes(r.id);
              return (
                <button 
                  key={r.id}
                  onClick={() => toggleSelect(r.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-md transition-colors text-left border ${isSelected ? 'bg-[var(--gold)]/10 border-[var(--gold)]/30' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden">
                       {r.image_url ? <img src={r.image_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] opacity-20">?</span>}
                    </div>
                    <div>
                      <p className="text-xs font-display" style={{ color: r.rarity ? RARITY_COLOR[r.rarity as Rarity] : 'inherit' }}>
                        {r.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase">{r.rarity || 'Normal'}</p>
                    </div>
                  </div>
                  {isSelected && <Check size={16} className="text-[var(--gold)]" />}
                </button>
              );
            })
          )}
        </div>

        <footer className="p-4 border-t border-white/10 flex gap-3">
          <button className="flex-1 py-2 rounded bg-white/5 hover:bg-white/10 transition-colors text-xs uppercase font-bold" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button 
            className="flex-1 py-2 rounded bg-[var(--gold)] text-black hover:opacity-90 transition-opacity text-xs uppercase font-bold"
            onClick={() => onSelect(tempSelected)}
            className="flex-1 py-2 rounded bg-[var(--gold)] text-black hover:opacity-90 transition-opacity text-xs uppercase font-bold"
          >
            {t("common.confirm")} ({tempSelected.length})
          </button>
        </footer>
      </div>
    </div>
  );
}

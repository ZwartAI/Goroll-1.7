import { useEffect, useMemo, useState } from "react";
import { Search, X, Check } from "lucide-react";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import {
  listNpcTemplates,
  spawnNpcToCombat,
  NPC_TYPES,
  NPC_DISPOSITIONS,
  type NpcTemplate,
} from "@/lib/npcs";
import type { CombatEncounter } from "@/lib/combat";
import { backdropProps } from "@/lib/modalBackdrop";
import { EnemyIcon, getEnemyAssetUrl, getEnemyCustomImage } from "@/components/app/EnemyIconPicker";

type Props = {
  campaignId: string;
  encounter: CombatEncounter;
  dm: { id: string; name: string; color: string };
  onClose: () => void;
};

type SortKey = "nameAsc" | "nameDesc" | "newest" | "oldest";

export function NpcPickerModal({ campaignId, encounter, dm, onClose }: Props) {
  const { t } = useT();
  const [templates, setTemplates] = useState<NpcTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [npcType, setNpcType] = useState<string>("");
  const [disposition, setDisposition] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortKey>("nameAsc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    listNpcTemplates(campaignId).then(rows => {
      if (alive) {
        setTemplates(rows);
        setLoading(false);
      }
    });
    return () => { alive = false; };
  }, [campaignId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = templates.filter(tpl => {
      if (q && !tpl.name.toLowerCase().includes(q)) return false;
      if (npcType && tpl.npc_type !== npcType) return false;
      if (disposition && tpl.disposition !== disposition) return false;
      return true;
    });

    out.sort((a, b) => {
      switch (sortBy) {
        case "nameAsc": return a.name.localeCompare(b.name);
        case "nameDesc": return b.name.localeCompare(a.name);
        case "newest": return (b.created_at || "").localeCompare(a.created_at || "");
        case "oldest": return (a.created_at || "").localeCompare(b.created_at || "");
        default: return 0;
      }
    });

    return out;
  }, [templates, query, npcType, disposition, sortBy]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const summonSelected = async () => {
    if (selected.size === 0 || busy) return;
    setBusy(true);
    const ids = Array.from(selected);
    const byId = new Map(templates.map(tp => [tp.id, tp]));
    let failed = 0;
    for (const id of ids) {
      const tpl = byId.get(id);
      if (!tpl) { failed++; continue; }
      // Default to 1 count, initiative 10, byInitiative position
      const r = await spawnNpcToCombat(tpl, encounter, { count: 1, initiative: 10, position: "byInitiative" }, dm);
      if (!r.ok) failed++;
    }
    setBusy(false);
    if (failed > 0) toast.error(t("npcs.spawnError"));
    if (failed < ids.length) {
      toast.success(t("npcs.spawned"));
      onClose();
    }
  };

  const hasFilters = !!(query || npcType || disposition || sortBy !== "nameAsc");
  const clearFilters = () => {
    setQuery("");
    setNpcType("");
    setDisposition("");
    setSortBy("nameAsc");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3" {...backdropProps(onClose)}>
      <div className="ornate-card max-w-2xl w-full max-h-[85vh] flex flex-col p-3 gap-2" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm uppercase tracking-widest text-[var(--gold)]">{t("npcs.addFromNpcs")}</h3>
          <button className="p-1 text-muted-foreground hover:text-foreground no-hover-grow" onClick={onClose} aria-label={t("common.close")}>
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <label className="relative block">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t("npcs.search")}
            className="w-full bg-secondary/40 border border-border rounded-md pl-7 pr-2 py-1.5 text-sm" />
        </label>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <FilterSelect value={npcType} onChange={setNpcType} label={t("npcs.npcType")}>
            <option value="">{t("npcs.allTypes")}</option>
            {NPC_TYPES.map(v => (
              <option key={v} value={v}>{t(`npcs.type_${v}`)}</option>
            ))}
          </FilterSelect>
          <FilterSelect value={disposition} onChange={setDisposition} label={t("npcs.disposition")}>
            <option value="">{t("npcs.allDispositions")}</option>
            {NPC_DISPOSITIONS.map(v => (
              <option key={v} value={v}>{t(`npcs.disp_${v}`)}</option>
            ))}
          </FilterSelect>
          <FilterSelect value={sortBy} onChange={(v) => setSortBy(v as SortKey)} label={t("bestiary.sortBy")}>
            <option value="nameAsc">{t("bestiary.sortNameAsc")}</option>
            <option value="nameDesc">{t("bestiary.sortNameDesc")}</option>
            <option value="newest">{t("bestiary.sortNewest")}</option>
            <option value="oldest">{t("bestiary.sortOldest")}</option>
          </FilterSelect>
        </div>

        {hasFilters && (
          <button className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-[var(--gold)] no-hover-grow self-end"
            onClick={clearFilters}>
            {t("bestiary.clearFilters")}
          </button>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {loading ? (
            <p className="text-xs text-muted-foreground py-6 text-center">{t("common.loading")}</p>
          ) : templates.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">{t("npcs.empty")}</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">{t("bestiary.noResults")}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filtered.map(tpl => {
                const isSelected = selected.has(tpl.id);
                const customImg = getEnemyCustomImage(tpl as any);
                const hasAsset = !!customImg || !!getEnemyAssetUrl(tpl.icon_key);
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    disabled={busy}
                    aria-pressed={isSelected}
                    className={`ornate-card no-hover-grow !p-2 flex items-center gap-2 text-left transition-colors disabled:opacity-50 ${isSelected ? "border-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_15%,transparent)]" : "hover:border-[var(--gold)]"}`}
                    onClick={() => toggleSelect(tpl.id)}
                  >
                    <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center bg-card shrink-0"
                      style={{ borderColor: tpl.color, color: tpl.color }}>
                      <EnemyIcon name={tpl.icon_key} size={20} fill={hasAsset} customImage={customImg} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-display truncate" style={{ color: tpl.color }}>{tpl.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {t(`npcs.type_${tpl.npc_type}`)} · {t(`npcs.disp_${tpl.disposition}`)}
                      </p>
                      <p className="text-[10px] text-muted-foreground/80 truncate">
                        HP {tpl.max_hp} · DEF {tpl.defense} · {tpl.speed}
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${isSelected ? "border-[var(--gold)] bg-[var(--gold)] text-[oklch(0.15_0.03_25)]" : "border-border text-transparent"}`}
                      aria-hidden="true"
                    >
                      <Check size={12} strokeWidth={3} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button className="btn-fantasy no-hover-grow text-xs" onClick={onClose} disabled={busy}>
            {t("common.close")}
          </button>
          <button
            className="btn-fantasy no-hover-grow text-xs"
            style={{ background: "var(--gradient-gold)", color: "oklch(0.15 0.03 25)" }}
            disabled={busy || selected.size === 0}
            onClick={summonSelected}
          >
            {t("bestiary.summonSelected", { n: String(selected.size) })}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, label, children }: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-0.5">
      <span className="text-[9px] font-display uppercase tracking-widest text-muted-foreground">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1.5 text-xs">
        {children}
      </select>
    </label>
  );
}

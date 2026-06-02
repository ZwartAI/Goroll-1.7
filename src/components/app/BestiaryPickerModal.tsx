import { useEffect, useMemo, useState } from "react";
import { Search, X, Check } from "lucide-react";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import {
  listTemplates,
  spawnFromTemplate,
  TIER_OPTIONS,
  ROLE_OPTIONS,
  BIOME_PRESETS,
  TIER_VISUALS,
  type EnemyTemplate,
  type EnemyTier,
  type EnemyRole,
} from "@/lib/bestiary";
import type { CombatEncounter } from "@/lib/combat";
import { backdropProps } from "@/lib/modalBackdrop";
import { EnemyIcon, getEnemyAssetUrl, getEnemyCustomImage } from "@/components/app/EnemyIconPicker";

type Props = {
  campaignId: string;
  encounter: CombatEncounter;
  dm: { id: string; name: string; color: string };
  onClose: () => void;
};

type RarityKey = "white" | "green" | "red" | "gold";
const RARITY_KEYS: RarityKey[] = ["white", "green", "red", "gold"];

type SortKey = "newest" | "oldest" | "nameAsc" | "nameDesc";

function rarityFromTier(tier: string | null | undefined): RarityKey | null {
  const v = tier ? TIER_VISUALS[tier] : null;
  if (!v) return null;
  const b = v.border.toLowerCase();
  if (b === "#eab308") return "gold";
  if (b === "#ef4444") return "red";
  if (b === "#16a34a") return "green";
  if (b === "#e5e7eb") return "white";
  return null;
}

function normalize(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/** Tiny Levenshtein distance — used for fuzzy "similar name" suggestions. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length, n = b.length;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** Returns a score (lower = better) or null if it doesn't match. */
function matchScore(name: string, query: string): number | null {
  if (!query) return 0;
  const n = normalize(name);
  const q = normalize(query);
  if (!q) return 0;
  if (n.includes(q)) return n.indexOf(q); // direct substring
  const tokens = n.split(/\s+/);
  if (tokens.some(tok => tok.startsWith(q))) return 50;
  const tolerance = Math.max(2, Math.floor(q.length / 3));
  let best = Infinity;
  for (const tok of tokens) {
    const d = levenshtein(tok, q);
    if (d < best) best = d;
  }
  const dWhole = levenshtein(n, q);
  best = Math.min(best, dWhole);
  if (best <= tolerance) return 100 + best;
  return null;
}

export function BestiaryPickerModal({ campaignId, encounter, dm, onClose }: Props) {
  const { t } = useT();
  const [templates, setTemplates] = useState<EnemyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState<RarityKey | "">("");
  const [tier, setTier] = useState<EnemyTier | "">("");
  const [role, setRole] = useState<EnemyRole | "">("");
  const [biome, setBiome] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    listTemplates(campaignId).then(rows => { if (alive) { setTemplates(rows); setLoading(false); } });
    return () => { alive = false; };
  }, [campaignId]);

  /** Unique biomes present in the loaded templates (plus curated presets that exist). */
  const biomeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const tpl of templates) if (tpl.biome) set.add(tpl.biome);
    for (const b of BIOME_PRESETS) if (set.has(b)) set.add(b);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [templates]);

  const filtered = useMemo(() => {
    const out: Array<{ tpl: EnemyTemplate; score: number }> = [];
    for (const tpl of templates) {
      if (rarity && rarityFromTier(tpl.tier) !== rarity) continue;
      if (tier && tpl.tier !== tier) continue;
      if (role && tpl.role !== role) continue;
      if (biome && (tpl.biome || "") !== biome) continue;
      const score = matchScore(tpl.name, query);
      if (score === null) continue;
      out.push({ tpl, score });
    }
    // When a query is active, relevance wins; otherwise honor the sort dropdown.
    if (query) {
      out.sort((a, b) => a.score - b.score || a.tpl.name.localeCompare(b.tpl.name));
    } else {
      out.sort((a, b) => {
        const A = a.tpl, B = b.tpl;
        switch (sortBy) {
          case "oldest":
            return (A.created_at || "").localeCompare(B.created_at || "");
          case "nameAsc":
            return A.name.localeCompare(B.name);
          case "nameDesc":
            return B.name.localeCompare(A.name);
          case "newest":
          default:
            return (B.created_at || "").localeCompare(A.created_at || "");
        }
      });
    }
    return out.map(x => x.tpl);
  }, [templates, rarity, tier, role, biome, query, sortBy]);

  const clearFilters = () => { setQuery(""); setRarity(""); setTier(""); setRole(""); setBiome(""); setSortBy("newest"); };
  const hasFilters = !!(query || rarity || tier || role || biome || sortBy !== "newest");

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
      const r = await spawnFromTemplate(tpl, encounter, { count: 1, initiative: 10, position: "byInitiative" }, dm);
      if (!r.ok) failed++;
    }
    setBusy(false);
    if (failed > 0) toast.error(t("bestiary.spawnError"));
    if (failed < ids.length) {
      toast.success(t("bestiary.spawned"));
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3" {...backdropProps(onClose)}>
      <div className="ornate-card max-w-2xl w-full max-h-[85vh] flex flex-col p-3 gap-2" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm uppercase tracking-widest text-[var(--gold)]">{t("bestiary.addFromBestiary")}</h3>
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
            placeholder={t("bestiary.search")}
            className="w-full bg-secondary/40 border border-border rounded-md pl-7 pr-2 py-1.5 text-sm" />
        </label>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <FilterSelect value={rarity} onChange={v => setRarity(v as RarityKey | "")} label={t("bestiary.filterRarity")}>
            <option value="">{t("bestiary.allRarities")}</option>
            {RARITY_KEYS.map(r => (
              <option key={r} value={r}>{t(`bestiary.rarity_${r}`)}</option>
            ))}
          </FilterSelect>
          <FilterSelect value={tier} onChange={v => setTier(v as EnemyTier | "")} label={t("bestiary.tier")}>
            <option value="">{t("bestiary.allTiers")}</option>
            {TIER_OPTIONS.map(v => (
              <option key={v} value={v}>{t(`bestiary.tier_${v}`)}</option>
            ))}
          </FilterSelect>
          <FilterSelect value={role} onChange={v => setRole(v as EnemyRole | "")} label={t("bestiary.role")}>
            <option value="">{t("bestiary.allRoles")}</option>
            {ROLE_OPTIONS.map(v => (
              <option key={v} value={v}>{t(`bestiary.role_${v}`)}</option>
            ))}
          </FilterSelect>
          <FilterSelect value={biome} onChange={setBiome} label={t("bestiary.biome")}>
            <option value="">{t("bestiary.allBiomes")}</option>
            {biomeOptions.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </FilterSelect>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <FilterSelect value={sortBy} onChange={(v) => setSortBy(v as SortKey)} label={t("bestiary.sortBy")}>
            <option value="newest">{t("bestiary.sortNewest")}</option>
            <option value="oldest">{t("bestiary.sortOldest")}</option>
            <option value="nameAsc">{t("bestiary.sortNameAsc")}</option>
            <option value="nameDesc">{t("bestiary.sortNameDesc")}</option>
          </FilterSelect>
          {hasFilters && (
            <button className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-[var(--gold)] no-hover-grow self-end"
              onClick={clearFilters}>
              {t("bestiary.clearFilters")}
            </button>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {loading ? (
            <p className="text-xs text-muted-foreground py-6 text-center">{t("common.loading")}</p>
          ) : templates.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">{t("bestiary.empty")}</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">{t("bestiary.noResults")}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filtered.map(tpl => {
                const rk = rarityFromTier(tpl.tier);
                const isSelected = selected.has(tpl.id);
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
                      style={{ borderColor: tpl.color, color: tpl.color }}>★</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-display truncate" style={{ color: tpl.color }}>{tpl.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        HP {tpl.max_hp} · DEF {tpl.defense}
                        {tpl.tier ? ` · ${t(`bestiary.tier_${tpl.tier}`)}` : ""}
                        {tpl.role ? ` · ${t(`bestiary.role_${tpl.role}`)}` : ""}
                      </p>
                      {(tpl.biome || rk) && (
                        <p className="text-[10px] text-muted-foreground/80 truncate">
                          {rk ? t(`bestiary.rarity_${rk}`) : ""}
                          {rk && tpl.biome ? " · " : ""}
                          {tpl.biome || ""}
                        </p>
                      )}
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

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
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

type Props = {
  campaignId: string;
  encounter: CombatEncounter;
  dm: { id: string; name: string; color: string };
  onClose: () => void;
};

type RarityKey = "white" | "green" | "red" | "gold";
const RARITY_KEYS: RarityKey[] = ["white", "green", "red", "gold"];

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
  // token-level substring (any word startsWith)
  const tokens = n.split(/\s+/);
  if (tokens.some(tok => tok.startsWith(q))) return 50;
  // fuzzy distance suggestion
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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState<RarityKey | "">("");
  const [tier, setTier] = useState<EnemyTier | "">("");
  const [role, setRole] = useState<EnemyRole | "">("");
  const [biome, setBiome] = useState<string>("");

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
    out.sort((a, b) => a.score - b.score || a.tpl.name.localeCompare(b.tpl.name));
    return out.map(x => x.tpl);
  }, [templates, rarity, tier, role, biome, query]);

  const clearFilters = () => { setQuery(""); setRarity(""); setTier(""); setRole(""); setBiome(""); };
  const hasFilters = !!(query || rarity || tier || role || biome);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3" onClick={onClose}>
      <div className="ornate-card max-w-2xl w-full max-h-[85vh] flex flex-col p-3 gap-2" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm uppercase tracking-widest text-[var(--gold)]">{t("bestiary.addFromBestiary")}</h3>
          <button className="p-1 text-muted-foreground hover:text-foreground" onClick={onClose} aria-label={t("common.close")}>
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

        {hasFilters && (
          <button className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-[var(--gold)] self-end"
            onClick={clearFilters}>
            {t("bestiary.clearFilters")}
          </button>
        )}

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
                return (
                  <button
                    key={tpl.id}
                    disabled={busyId === tpl.id}
                    className="ornate-card !p-2 flex items-center gap-2 text-left hover:border-[var(--gold)] disabled:opacity-50"
                    onClick={async () => {
                      setBusyId(tpl.id);
                      const r = await spawnFromTemplate(tpl, encounter, { count: 1, initiative: 10, position: "byInitiative" }, dm);
                      setBusyId(null);
                      if (!r.ok) toast.error(t("bestiary.spawnError"));
                      else { toast.success(t("bestiary.spawned")); onClose(); }
                    }}>
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
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button className="btn-fantasy w-full text-xs mt-1" onClick={onClose}>{t("common.close")}</button>
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

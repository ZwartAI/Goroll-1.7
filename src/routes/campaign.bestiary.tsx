import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { useGameData } from "@/lib/useGame";
import { PageFrame } from "@/components/app/Frame";
import { ChevronLeft, Plus, Search, Eye, Edit3, Copy, Trash2, Swords, Crown, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  deleteTemplate,
  duplicateTemplate,
  listTemplates,
  TIER_OPTIONS,
  ROLE_OPTIONS,
  type EnemyTemplate,
} from "@/lib/bestiary";
import { EnemyIcon } from "@/components/app/EnemyIconPicker";
import { MonsterEditor } from "@/components/app/MonsterEditor";
import { MonsterSheetModal } from "@/components/app/MonsterSheetModal";
import { AddFromBestiaryModal } from "@/components/app/AddFromBestiaryModal";

export const Route = createFileRoute("/campaign/bestiary")({ component: Bestiary });

function Bestiary() {
  const { t } = useT();
  const { character, campaign, combat, loading } = useGameData();

  const [templates, setTemplates] = useState<EnemyTemplate[]>([]);
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [onlyElite, setOnlyElite] = useState(false);
  const [onlyBoss, setOnlyBoss] = useState(false);
  const [biome, setBiome] = useState("");

  const [editing, setEditing] = useState<EnemyTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<EnemyTemplate | null>(null);
  const [spawning, setSpawning] = useState<EnemyTemplate | null>(null);

  const isDM = character?.role === "dm";

  useEffect(() => {
    if (!campaign) return;
    const reload = () => listTemplates(campaign.id).then(setTemplates);
    reload();
    const ch = (supabase as any).channel(`bestiary:${campaign.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "enemy_templates", filter: `campaign_id=eq.${campaign.id}` }, reload)
      .subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [campaign?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter(tpl => {
      if (q && !tpl.name.toLowerCase().includes(q)) return false;
      if (tier && tpl.tier !== tier) return false;
      if (role && tpl.role !== role) return false;
      if (biome && !(tpl.biome || "").toLowerCase().includes(biome.toLowerCase())) return false;
      if (onlyElite && !tpl.is_elite) return false;
      if (onlyBoss && !tpl.is_boss) return false;
      return true;
    });
  }, [templates, search, tier, role, biome, onlyElite, onlyBoss]);

  if (loading || !character || !campaign) {
    return <PageFrame><p className="text-center text-muted-foreground">{t("dm.loading")}</p></PageFrame>;
  }
  if (!isDM) {
    return (
      <PageFrame>
        <p className="text-center text-muted-foreground py-6">{t("bestiary.dmOnly")}</p>
        <Link to="/campaign/profile" className="btn-fantasy block text-center">{t("common.back")}</Link>
      </PageFrame>
    );
  }

  const dmCtx = { id: character.id, name: character.name, color: character.color };

  return (
    <PageFrame>
      <header className="flex items-center gap-2 mb-3">
        <Link to="/campaign/dm" className="text-muted-foreground"><ChevronLeft size={20} /></Link>
        <h1 className="font-display text-lg flex-1 text-[var(--gold)] rune-glow">🐉 {t("bestiary.title")}</h1>
        <button className="btn-fantasy text-xs"
          style={{ background: "var(--gradient-gold)", color: "oklch(0.15 0.03 25)" }}
          onClick={() => setCreating(true)}>
          <Plus size={14} className="inline" /> {t("bestiary.createMonster")}
        </button>
      </header>
      <div className="gem-divider mb-3" />

      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 ornate-card px-2 py-1">
          <Search size={14} className="text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("bestiary.search")}
            className="flex-1 bg-transparent outline-none text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={tier} onChange={e => setTier(e.target.value)}
            className="bg-secondary/40 border border-border rounded-md px-2 py-1.5 text-xs">
            <option value="">{t("bestiary.allTiers")}</option>
            {TIER_OPTIONS.map(v => <option key={v} value={v}>{t(`bestiary.tier_${v}`)}</option>)}
          </select>
          <select value={role} onChange={e => setRole(e.target.value)}
            className="bg-secondary/40 border border-border rounded-md px-2 py-1.5 text-xs">
            <option value="">{t("bestiary.allRoles")}</option>
            {ROLE_OPTIONS.map(v => <option key={v} value={v}>{t(`bestiary.role_${v}`)}</option>)}
          </select>
          <input value={biome} onChange={e => setBiome(e.target.value)}
            placeholder={t("bestiary.biome")}
            className="bg-secondary/40 border border-border rounded-md px-2 py-1.5 text-xs" />
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={onlyElite} onChange={e => setOnlyElite(e.target.checked)} className="accent-[var(--gold)]" />
              {t("bestiary.isElite")}
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={onlyBoss} onChange={e => setOnlyBoss(e.target.checked)} className="accent-[var(--gold)]" />
              {t("bestiary.isBoss")}
            </label>
          </div>
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-xs text-muted-foreground py-8">{t("bestiary.empty")}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filtered.map(tpl => (
          <article key={tpl.id} className="ornate-card p-3 space-y-2"
            style={{ borderColor: `color-mix(in oklab, ${tpl.color} 55%, transparent)` }}>
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center bg-card shrink-0"
                style={{ borderColor: tpl.color, color: tpl.color }}>
                <EnemyIcon name={tpl.icon_key} size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display truncate" style={{ color: tpl.color }}>{tpl.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {t(`bestiary.tier_${tpl.tier}`)} · {t(`bestiary.role_${tpl.role}`)}
                </p>
              </div>
              <div className="flex flex-col gap-0.5 items-end">
                {tpl.is_elite && <span title={t("bestiary.isElite")}><Star size={12} className="text-purple-400" /></span>}
                {tpl.is_boss && <span title={t("bestiary.isBoss")}><Crown size={12} className="text-yellow-400" /></span>}
              </div>
            </div>
            <div className="grid grid-cols-3 text-center text-[10px] text-muted-foreground">
              <span>HP {tpl.max_hp}</span>
              <span>DEF {tpl.defense}</span>
              <span>{tpl.speed}</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              <IconBtn icon={<Eye size={12} />} title={t("bestiary.viewSheet")} onClick={() => setViewing(tpl)} />
              <IconBtn icon={<Edit3 size={12} />} title={t("common.edit")} onClick={() => setEditing(tpl)} />
              <IconBtn icon={<Copy size={12} />} title={t("bestiary.duplicate")} onClick={async () => {
                const r = await duplicateTemplate(tpl, dmCtx);
                if (!r.ok) toast.error(t("bestiary.saveError"));
                else toast.success(t("bestiary.duplicated"));
              }} />
              <IconBtn icon={<Trash2 size={12} />} danger title={t("bestiary.delete")} onClick={async () => {
                if (!confirm(t("bestiary.confirmDelete"))) return;
                const r = await deleteTemplate(tpl);
                if (!r.ok) toast.error(t("bestiary.saveError"));
                else toast.success(t("bestiary.deleted"));
              }} />
            </div>
            {combat.encounter && combat.encounter.status !== "ended" && (
              <button className="btn-fantasy w-full text-[11px]"
                style={{ background: "var(--loss)", color: "white" }}
                onClick={() => setSpawning(tpl)}>
                <Swords size={12} className="inline mr-1" /> {t("bestiary.addToCombat")}
              </button>
            )}
          </article>
        ))}
      </div>

      {creating && (
        <MonsterEditor campaignId={campaign.id} dm={dmCtx} onClose={() => setCreating(false)} />
      )}
      {editing && (
        <MonsterEditor campaignId={campaign.id} dm={dmCtx} editing={editing} onClose={() => setEditing(null)} />
      )}
      {viewing && (
        <MonsterSheetModal
          template={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null); }}
          onAddToCombat={combat.encounter && combat.encounter.status !== "ended" ? () => { setSpawning(viewing); setViewing(null); } : undefined}
        />
      )}
      {spawning && combat.encounter && (
        <AddFromBestiaryModal
          template={spawning}
          encounter={combat.encounter}
          dm={dmCtx}
          onClose={() => setSpawning(null)}
        />
      )}
    </PageFrame>
  );
}

function IconBtn({ icon, onClick, title, danger }: {
  icon: React.ReactNode; onClick: () => void; title: string; danger?: boolean;
}) {
  return (
    <button title={title} onClick={onClick}
      className="btn-fantasy text-[10px] py-1 flex items-center justify-center"
      style={danger ? { background: "color-mix(in oklab, var(--loss) 35%, var(--card))" } : undefined}>
      {icon}
    </button>
  );
}

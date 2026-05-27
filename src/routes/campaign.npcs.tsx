import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { useGameData } from "@/lib/useGame";
import { PageFrame } from "@/components/app/Frame";
import { ChevronLeft, Plus, Search, Eye, Edit3, Copy, Trash2, Swords } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  deleteNpcTemplate,
  duplicateNpcTemplate,
  listNpcTemplates,
  NPC_TYPES,
  NPC_DISPOSITIONS,
  type NpcTemplate,
} from "@/lib/npcs";
import { EnemyIcon, getEnemyAssetUrl, getEnemyCustomImage } from "@/components/app/EnemyIconPicker";
import { NpcEditorModal } from "@/components/app/NpcEditorModal";
import { NpcSheetModal } from "@/components/app/NpcSheetModal";
import { AddNpcToCombatModal } from "@/components/app/AddNpcToCombatModal";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";

export const Route = createFileRoute("/campaign/npcs")({ component: NpcsPage });

function NpcsPage() {
  const { t } = useT();
  const { character, campaign, combat, loading } = useGameData();

  const [templates, setTemplates] = useState<NpcTemplate[]>([]);
  const [search, setSearch] = useState("");
  const [npcType, setNpcType] = useState<string>("");
  const [disp, setDisp] = useState<string>("");

  const [editing, setEditing] = useState<NpcTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<NpcTemplate | null>(null);
  const [spawning, setSpawning] = useState<NpcTemplate | null>(null);
  const [deleting, setDeleting] = useState<NpcTemplate | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const isDM = character?.role === "dm";

  useEffect(() => {
    if (!campaign) return;
    const reload = () => listNpcTemplates(campaign.id).then(setTemplates);
    reload();
    const ch = (supabase as any).channel(`npcs:${campaign.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "npc_templates", filter: `campaign_id=eq.${campaign.id}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "npc_template_skills", filter: `campaign_id=eq.${campaign.id}` }, reload)
      .subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [campaign?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter(tpl => {
      if (q && !tpl.name.toLowerCase().includes(q)) return false;
      if (npcType && tpl.npc_type !== npcType) return false;
      if (disp && tpl.disposition !== disp) return false;
      return true;
    });
  }, [templates, search, npcType, disp]);

  if (loading || !character || !campaign) {
    return <PageFrame><p className="text-center text-muted-foreground">{t("dm.loading")}</p></PageFrame>;
  }
  if (!isDM) {
    return (
      <PageFrame>
        <p className="text-center text-muted-foreground py-6">{t("npcs.dmOnly")}</p>
        <Link to="/campaign/profile" className="btn-fantasy block text-center">{t("common.back")}</Link>
      </PageFrame>
    );
  }

  const dmCtx = { id: character.id, name: character.name, color: character.color };

  return (
    <PageFrame>
      <header className="flex items-center gap-2 mb-3">
        <Link to="/campaign/dm" className="text-muted-foreground"><ChevronLeft size={20} /></Link>
        <h1 className="font-display text-lg flex-1 text-[var(--gold)] rune-glow">🧝 {t("npcs.title")}</h1>
      </header>
      <div className="gem-divider mb-3" />

      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 ornate-card px-2 py-1">
          <Search size={14} className="text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("npcs.search")}
            className="flex-1 bg-transparent outline-none text-sm" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={npcType === ""} label={t("npcs.allTypes")} onClick={() => setNpcType("")} />
          {NPC_TYPES.map(v => (
            <Chip key={v} active={npcType === v} label={t(`npcs.type_${v}`)} onClick={() => setNpcType(v)} />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={disp === ""} label={t("npcs.allDispositions")} onClick={() => setDisp("")} />
          {NPC_DISPOSITIONS.map(v => (
            <Chip key={v} active={disp === v} label={t(`npcs.disp_${v}`)} onClick={() => setDisp(v)} />
          ))}
        </div>
        <button
          className="btn-fantasy w-full text-xs inline-flex items-center justify-center gap-1"
          style={{ background: "var(--gradient-gold)", color: "oklch(0.15 0.03 25)" }}
          onClick={() => setCreating(true)}>
          <Plus size={12} /> {t("npcs.createNpc")}
        </button>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-xs text-muted-foreground py-8">{t("npcs.empty")}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filtered.map(tpl => {
          const customImg = getEnemyCustomImage(tpl as any);
          const hasAsset = !!customImg || !!getEnemyAssetUrl(tpl.icon_key);
          return (
            <article key={tpl.id} className="ornate-card p-3 space-y-2"
              style={{ borderColor: `color-mix(in oklab, ${tpl.color} 55%, transparent)` }}>
              <div className="flex items-center gap-2">
                <div
                  className="w-14 h-14 rounded-full border-2 overflow-hidden flex items-center justify-center bg-card shrink-0 relative"
                  style={{ borderColor: tpl.color, color: tpl.color }}>
                  <EnemyIcon name={tpl.icon_key} size={28} fill={hasAsset} customImage={customImg} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display truncate" style={{ color: tpl.color }}>{tpl.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {t(`npcs.type_${tpl.npc_type}`)} · {t(`npcs.disp_${tpl.disposition}`)}
                  </p>
                  {tpl.biome && (
                    <p className="text-[10px] text-muted-foreground truncate">{tpl.biome}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 text-center text-[10px] text-muted-foreground">
                <span>HP {tpl.max_hp}</span>
                <span>DEF {tpl.defense}</span>
                <span>{tpl.speed}</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                <IconBtn icon={<Eye size={12} />} title={t("npcs.viewSheet")} onClick={() => setViewing(tpl)} />
                <IconBtn icon={<Edit3 size={12} />} title={t("common.edit")} onClick={() => setEditing(tpl)} />
                <IconBtn icon={<Copy size={12} />} title={t("npcs.duplicate")} onClick={async () => {
                  const r = await duplicateNpcTemplate(tpl, dmCtx);
                  if (!r.ok) toast.error(t("npcs.saveError"));
                  else toast.success(t("npcs.duplicated"));
                }} />
                <IconBtn icon={<Trash2 size={12} />} danger title={t("npcs.delete")} onClick={() => setDeleting(tpl)} />
              </div>
              {combat.encounter && combat.encounter.status !== "ended" && (
                <button className="btn-fantasy w-full text-[11px]"
                  style={{ background: "var(--gold)", color: "oklch(0.15 0.03 25)" }}
                  onClick={() => setSpawning(tpl)}>
                  <Swords size={12} className="inline mr-1" /> {t("npcs.addToCombat")}
                </button>
              )}
            </article>
          );
        })}
      </div>

      {creating && (
        <NpcEditorModal campaignId={campaign.id} dm={dmCtx} onClose={() => setCreating(false)}
          onSaved={() => listNpcTemplates(campaign.id).then(setTemplates)} />
      )}
      {editing && (
        <NpcEditorModal campaignId={campaign.id} dm={dmCtx} editing={editing} onClose={() => setEditing(null)}
          onSaved={() => listNpcTemplates(campaign.id).then(setTemplates)} />
      )}
      {viewing && (
        <NpcSheetModal
          template={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null); }}
          onAddToCombat={combat.encounter && combat.encounter.status !== "ended" ? () => { setSpawning(viewing); setViewing(null); } : undefined}
        />
      )}
      {spawning && combat.encounter && (
        <AddNpcToCombatModal
          template={spawning}
          encounter={combat.encounter}
          dm={dmCtx}
          onClose={() => setSpawning(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title={t("npcs.confirmDeleteTitle")}
        description={t("npcs.confirmDelete")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          setDeleteBusy(true);
          const r = await deleteNpcTemplate(deleting);
          setDeleteBusy(false);
          if (!r.ok) toast.error(t("npcs.saveError"));
          else {
            toast.success(t("npcs.deleted"));
            setTemplates(prev => prev.filter(x => x.id !== deleting.id));
          }
          setDeleting(null);
        }}
      />
    </PageFrame>
  );
}

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] px-2.5 py-1 rounded-md border transition ${
        active
          ? "bg-[var(--gold)]/20 border-[var(--gold)] text-[var(--gold)]"
          : "border-border text-foreground hover:border-[var(--gold)]/50"
      }`}>
      {label}
    </button>
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

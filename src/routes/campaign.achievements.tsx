import { createFileRoute, Link } from "@tanstack/react-router";
import { useGameData } from "@/lib/useGame";
import { PageFrame } from "@/components/app/Frame";
import { ArrowLeft, Trophy, Share2, Pencil, Trash2, Archive, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/game";
import { pushLog } from "@/lib/log";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/campaign/achievements")({ component: Page });

const COLORS = [
  { v: "yellow", c: "#fbbf24" }, { v: "red", c: "#ef4444" },
  { v: "gray", c: "#9ca3af" }, { v: "green", c: "#22c55e" },
  { v: "blue", c: "#3b82f6" }, { v: "purple", c: "#a855f7" },
];

type Template = { id: string; campaign_id: string; label: string; color: string };

function colorOf(v: string) { return COLORS.find(c => c.v === v)?.c || "#fbbf24"; }

function Page() {
  const { character, characters, achievements, campaign, loading } = useGameData();
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("yellow");
  const [targets, setTargets] = useState<string[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedAch, setSelectedAch] = useState<string | null>(null);
  const [selectedTpl, setSelectedTpl] = useState<string | null>(null);
  const [shareTargets, setShareTargets] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ id: string; label: string; color: string } | null>(null);
  const session = getSession();
  const isDM = session?.role === "dm";
  const { t } = useT();

  useEffect(() => {
    if (!campaign) return;
    const load = async () => {
      const { data } = await supabase.from("achievement_templates").select("*").eq("campaign_id", campaign.id).order("created_at", { ascending: false });
      setTemplates((data || []) as Template[]);
    };
    load();
    const ch = supabase.channel(`templates:${campaign.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "achievement_templates", filter: `campaign_id=eq.${campaign.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [campaign?.id]);

  if (loading || !character) return <PageFrame><p className="text-center text-muted-foreground">{t("common.loading")}</p></PageFrame>;

  const players = characters.filter(c => c.role === "player");

  async function add() {
    if (!label.trim()) return;
    if (!isDM) {
      await supabase.from("achievements").insert([{ character_id: character!.id, label: label.trim(), color }]);
      setLabel(""); return;
    }
    if (!targets.length) {
      await supabase.from("achievement_templates").insert([{ campaign_id: campaign!.id, label: label.trim(), color }]);
      setLabel("");
      return;
    }
    const rows = targets.map(id => ({ character_id: id, label: label.trim(), color }));
    await supabase.from("achievements").insert(rows);
    if (campaign) {
      const named = players.filter(p => targets.includes(p.id));
      await pushLog(campaign.id, [
        { t: "char", v: character!.name, color: character!.color },
        { t: "text", v: t("achievements.grantedLog", { label: label.trim(), names: named.map(n => n.name).join(", ") }) },
      ] as any);
    }
    setLabel(""); setTargets([]);
  }

  async function sendTemplate(tpl: Template, ids: string[]) {
    if (!ids.length) return;
    const rows = ids.map(id => ({ character_id: id, label: tpl.label, color: tpl.color }));
    await supabase.from("achievements").insert(rows);
    await supabase.from("achievement_templates").delete().eq("id", tpl.id);
    if (campaign) {
      const named = players.filter(p => ids.includes(p.id));
      await pushLog(campaign.id, [
        { t: "char", v: character!.name, color: character!.color },
        { t: "text", v: t("achievements.grantedLog", { label: tpl.label, names: named.map(n => n.name).join(", ") }) },
      ] as any);
    }
    setSelectedTpl(null); setShareTargets([]);
  }

  async function deleteTemplate(id: string) {
    await supabase.from("achievement_templates").delete().eq("id", id);
    if (selectedTpl === id) setSelectedTpl(null);
  }

  async function shareAch(a: any, ids: string[]) {
    if (!ids.length) return;
    const rows = ids.filter(id => id !== a.character_id).map(id => ({ character_id: id, label: a.label, color: a.color }));
    if (rows.length) {
      await supabase.from("achievements").insert(rows);
      if (campaign) {
        const named = players.filter(p => rows.some(r => r.character_id === p.id));
        await pushLog(campaign.id, [
          { t: "char", v: character!.name, color: character!.color },
          { t: "text", v: t("achievements.sharedLog", { label: a.label, names: named.map(n => n.name).join(", ") }) },
        ] as any);
      }
    }
    setSelectedAch(null); setShareTargets([]);
  }

  async function returnToVault(a: any) {
    const { data: existing } = await supabase.from("achievement_templates")
      .select("id").eq("campaign_id", campaign!.id).eq("label", a.label).eq("color", a.color).limit(1);
    if (!existing || existing.length === 0) {
      await supabase.from("achievement_templates").insert([{ campaign_id: campaign!.id, label: a.label, color: a.color }]);
    }
    await supabase.from("achievements").delete().eq("id", a.id);
    setSelectedAch(null);
  }

  async function saveEdit() {
    if (!editing) return;
    await supabase.from("achievements").update({ label: editing.label, color: editing.color }).eq("id", editing.id);
    setEditing(null);
  }

  async function remove(id: string) {
    await supabase.from("achievements").delete().eq("id", id);
    setSelectedAch(null);
  }

  if (!isDM) {
    const visible = achievements.filter(a => a.character_id === character.id);
    return (
      <PageFrame title={t("achievements.title")} subtitle={character.name} right={<Link to="/campaign/profile" className="text-muted-foreground"><ArrowLeft size={20}/></Link>}>
        <div className="ornate-card p-6 text-center mb-4">
          <Trophy className="mx-auto text-[var(--gold)]" size={48} />
        </div>
        <div className="ornate-card p-4 space-y-2 max-h-[50vh] overflow-y-auto">
          {visible.map(a => {
            const cc = colorOf(a.color);
            return (
              <div key={a.id} className="px-3 py-2 rounded font-semibold text-sm"
                style={{ background: `color-mix(in oklab, ${cc} 25%, transparent)`, color: cc, border: `1px solid ${cc}` }}>
                {a.label}
              </div>
            );
          })}
          {!visible.length && <p className="text-center text-xs text-muted-foreground py-4">{t("achievements.notYet")}</p>}
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame title={t("achievements.title")} subtitle={t("achievements.adminSubtitle")} right={<Link to="/campaign/dm" className="text-muted-foreground"><ArrowLeft size={20}/></Link>}>
      <div className="ornate-card p-6 text-center mb-4">
        <Trophy className="mx-auto text-[var(--gold)]" size={48} />
      </div>

      <div className="ornate-card p-4 mb-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
          <Archive size={14}/> {t("achievements.vault", { count: templates.length })}
        </p>
        <div className="space-y-2 max-h-[35vh] overflow-y-auto">
          {templates.map(tpl => {
            const cc = colorOf(tpl.color);
            const open = selectedTpl === tpl.id;
            return (
              <div key={tpl.id}>
                <button onClick={() => { setSelectedTpl(open ? null : tpl.id); setShareTargets([]); }}
                  className="w-full flex justify-between items-center px-3 py-2 rounded text-sm font-semibold"
                  style={{ background: `color-mix(in oklab, ${cc} 25%, transparent)`, color: cc, border: `1px solid ${cc}` }}>
                  <span>{tpl.label}</span>
                  <span className="text-xs opacity-70">{open ? "▴" : "▾"}</span>
                </button>
                {open && (
                  <div className="mt-2 p-3 border border-border rounded space-y-2 bg-[color-mix(in_oklab,var(--card)_70%,transparent)]">
                    <p className="text-xs text-muted-foreground">{t("achievements.sendTo")}</p>
                    <div className="flex flex-wrap gap-2">
                      {players.map(p => {
                        const sel = shareTargets.includes(p.id);
                        return (
                          <button key={p.id} onClick={() => setShareTargets(sel ? shareTargets.filter(x=>x!==p.id) : [...shareTargets, p.id])}
                            className="text-xs px-2 py-1 rounded border"
                            style={sel ? { background: p.color, color: "#000", borderColor: p.color } : { borderColor: "var(--border)", color: p.color }}>
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-fantasy flex-1 text-xs" disabled={!shareTargets.length} onClick={() => sendTemplate(tpl, shareTargets)}>
                        <Send size={12} className="inline mr-1"/> {t("achievements.send")}
                      </button>
                      <button className="text-xs px-3 py-2 rounded border border-destructive text-destructive" onClick={() => deleteTemplate(tpl.id)}>
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {!templates.length && <p className="text-center text-xs text-muted-foreground py-4">{t("achievements.vaultEmpty")}</p>}
        </div>
      </div>

      <div className="ornate-card p-4 mb-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          {t("achievements.grantedTitle", { count: achievements.length })}
        </p>
        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
          {achievements.map(a => {
            const cc = colorOf(a.color);
            const owner = characters.find(c => c.id === a.character_id);
            const open = selectedAch === a.id;
            const isEditing = editing?.id === a.id;
            return (
              <div key={a.id}>
                <button onClick={() => { setSelectedAch(open ? null : a.id); setShareTargets([]); setEditing(null); }}
                  className="w-full flex justify-between items-center px-3 py-2 rounded text-sm"
                  style={{ background: `color-mix(in oklab, ${cc} 25%, transparent)`, color: cc, border: `1px solid ${cc}` }}>
                  <span className="font-semibold">
                    {a.label}
                    {owner && <span className="ml-2 opacity-70 text-xs">— {owner.name}</span>}
                  </span>
                  <span className="text-xs opacity-70">{open ? "▴" : "▾"}</span>
                </button>
                {open && (
                  <div className="mt-2 p-3 border border-border rounded space-y-2 bg-[color-mix(in_oklab,var(--card)_70%,transparent)]">
                    {isEditing ? (
                      <>
                        <input className="w-full bg-input border border-border rounded px-2 py-1 text-sm" value={editing!.label} onChange={e => setEditing({ ...editing!, label: e.target.value })}/>
                        <div className="flex gap-2 flex-wrap">
                          {COLORS.map(c => (
                            <button key={c.v} onClick={() => setEditing({ ...editing!, color: c.v })} className="w-6 h-6 rounded-full border-2"
                              style={{ background: c.c, borderColor: editing!.color === c.v ? "var(--gold)" : "transparent" }}/>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button className="btn-fantasy flex-1 text-xs" onClick={saveEdit}>{t("common.save")}</button>
                          <button className="text-xs px-3 py-2 rounded border border-border" onClick={() => setEditing(null)}>{t("common.cancel")}</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground">{t("achievements.shareDuplicates")}</p>
                        <div className="flex flex-wrap gap-2">
                          {players.filter(p => p.id !== a.character_id).map(p => {
                            const sel = shareTargets.includes(p.id);
                            return (
                              <button key={p.id} onClick={() => setShareTargets(sel ? shareTargets.filter(x=>x!==p.id) : [...shareTargets, p.id])}
                                className="text-xs px-2 py-1 rounded border"
                                style={sel ? { background: p.color, color: "#000", borderColor: p.color } : { borderColor: "var(--border)", color: p.color }}>
                                {p.name}
                              </button>
                            );
                          })}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button className="btn-fantasy text-xs" disabled={!shareTargets.length} onClick={() => shareAch(a, shareTargets)}>
                            <Share2 size={12} className="inline mr-1"/> {t("achievements.share")}
                          </button>
                          <button className="text-xs px-3 py-2 rounded border border-border" onClick={() => setEditing({ id: a.id, label: a.label, color: a.color })}>
                            <Pencil size={12} className="inline mr-1"/> {t("achievements.edit")}
                          </button>
                          <button className="text-xs px-3 py-2 rounded border border-border" onClick={() => returnToVault(a)}>
                            <Archive size={12} className="inline mr-1"/> {t("achievements.toVault")}
                          </button>
                          <button className="text-xs px-3 py-2 rounded border border-destructive text-destructive" onClick={() => remove(a.id)}>
                            <Trash2 size={12} className="inline mr-1"/> {t("achievements.deleteBtn")}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {!achievements.length && <p className="text-center text-xs text-muted-foreground py-4">{t("achievements.notGrantedYet")}</p>}
        </div>
      </div>

      <div className="ornate-card p-4 space-y-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("achievements.createTitle")}</p>
        <input className="w-full bg-input border border-border rounded px-3 py-2 text-sm" placeholder={t("achievements.placeholder")} value={label} onChange={e => setLabel(e.target.value)} />
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button key={c.v} onClick={() => setColor(c.v)} className="w-7 h-7 rounded-full border-2"
              style={{ background: c.c, borderColor: color === c.v ? "var(--gold)" : "transparent" }} />
          ))}
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("achievements.recipients")}</p>
            <button className="text-xs underline text-[var(--gold)]"
              onClick={() => setTargets(targets.length === players.length ? [] : players.map(p => p.id))}>
              {targets.length === players.length ? t("achievements.none") : t("achievements.all")}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {players.map(p => {
              const sel = targets.includes(p.id);
              return (
                <button key={p.id} onClick={() => setTargets(sel ? targets.filter(x => x !== p.id) : [...targets, p.id])}
                  className="text-xs px-2 py-1 rounded border"
                  style={sel
                    ? { background: p.color, color: "#000", borderColor: p.color }
                    : { borderColor: "var(--border)", color: p.color }}>
                  {p.name}
                </button>
              );
            })}
            {!players.length && <p className="text-xs text-muted-foreground">{t("achievements.noPlayers")}</p>}
          </div>
        </div>
        <button className="btn-fantasy w-full" onClick={add} disabled={!label.trim()}>
          {targets.length ? t("achievements.grantTo", { count: targets.length }) : t("achievements.storeInVault")}
        </button>
        <p className="text-[10px] text-muted-foreground text-center">{t("achievements.vaultHint")}</p>
      </div>
    </PageFrame>
  );
}

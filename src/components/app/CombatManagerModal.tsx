import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Users, Search, X, Trash2, AlertTriangle } from "lucide-react";
import { useT } from "@/lib/i18n";
import { backdropProps } from "@/lib/modalBackdrop";
import {
  activeBlock,
  buildOrderedTurns,
  isEnemy,
  removeEnemy,
  type CombatEncounter,
  type CombatParticipant,
  type CombatTurnGroup,
  type CombatTurnPin,
} from "@/lib/combat";

type Props = {
  encounter: CombatEncounter;
  participants: CombatParticipant[];
  groups: CombatTurnGroup[];
  pins: CombatTurnPin[];
  dm: { id: string; name: string; color: string };
  onClose: () => void;
};

type EntityKind = "enemy" | "npc" | "copy" | "temporary";

function classifyEntity(p: CombatParticipant): EntityKind {
  if ((p as any).npc_template_id) return "npc";
  if (p.enemy_template_id) {
    if ((p.enemy_instance_number ?? 0) > 1) return "copy";
    return "enemy";
  }
  return "temporary";
}

export function CombatManagerModal({ encounter, participants, groups, pins, dm, onClose }: Props) {
  const { t } = useT();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | EntityKind>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);

  const blocks = useMemo(() => buildOrderedTurns(participants, groups, pins), [participants, groups, pins]);
  const active = activeBlock(encounter, blocks);
  const activeParticipantId =
    active?.kind === "solo" ? active.participant.id :
    active?.kind === "pin" ? active.linked.id : null;

  const enemies = useMemo(() => participants.filter(isEnemy), [participants]);
  const pinCountByParticipant = useMemo(() => {
    const m = new Map<string, number>();
    for (const pin of pins) m.set(pin.linked_participant_id, (m.get(pin.linked_participant_id) || 0) + 1);
    return m;
  }, [pins]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return enemies.filter(p => {
      const kind = classifyEntity(p);
      if (filter !== "all" && filter !== kind) return false;
      if (term && !(p.display_name || "").toLowerCase().includes(term)) return false;
      return true;
    });
  }, [enemies, search, filter]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(filtered.map(p => p.id)));
  const deselect = () => setSelected(new Set());

  const selectedList = useMemo(() => enemies.filter(p => selected.has(p.id)), [enemies, selected]);
  const selectedHasActive = selectedList.some(p => p.id === activeParticipantId);
  const selectedExtraTurnCount = selectedList.reduce((acc, p) => acc + (pinCountByParticipant.get(p.id) || 0), 0);

  const handleRemove = async () => {
    if (selectedList.length === 0) return;
    setWorking(true);
    let ok = 0, fail = 0, archivedCount = 0, pinsRemoved = 0;
    // Sort by descending order_index so current_turn_index adjustments stay consistent.
    const ordered = [...selectedList].sort((a, b) => b.order_index - a.order_index);
    for (const p of ordered) {
      const r = await removeEnemy(p, encounter, dm);
      if (r.ok) {
        ok++;
        if ((r as any).archived) archivedCount++;
        pinsRemoved += (r as any).removedPins || 0;
      } else {
        fail++;
      }
    }
    setWorking(false);
    if (ok) toast.success(t("combat.manager.removedToast", { n: ok }));
    if (fail) toast.error(t("combat.manager.removedError", { n: fail }));
    void archivedCount; void pinsRemoved;
    onClose();
  };

  const filterChips: Array<{ id: "all" | EntityKind; label: string }> = [
    { id: "all", label: t("combat.manager.filterAll") },
    { id: "enemy", label: t("combat.manager.typeEnemy") },
    { id: "npc", label: t("combat.manager.typeNpc") },
    { id: "copy", label: t("combat.manager.typeCopy") },
    { id: "temporary", label: t("combat.manager.typeTemporary") },
  ];

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 flex items-end sm:items-center justify-center p-2 sm:p-4" {...backdropProps(onClose)}>
      <div className="ornate-card w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-2 p-3 border-b border-[var(--gold)]/30">
          <Users size={16} className="text-[var(--gold)]" />
          <h2 className="font-display text-sm uppercase tracking-widest text-[var(--gold)] flex-1">
            {t("combat.manager.title")}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10" aria-label={t("common.close")}>
            <X size={16} />
          </button>
        </div>

        {!confirming ? (
          <>
            {/* Controls */}
            <div className="p-3 space-y-2 border-b border-[var(--gold)]/20">
              <p className="text-[11px] text-muted-foreground">{t("combat.manager.subtitle")}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t("combat.manager.searchPlaceholder")}
                    className="w-full bg-background border border-[var(--gold)]/30 rounded pl-7 pr-2 py-1.5 text-xs"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {filterChips.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setFilter(c.id)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      filter === c.id
                        ? "bg-[var(--gold)]/30 border-[var(--gold)] text-[var(--gold)]"
                        : "border-[var(--gold)]/30 text-muted-foreground"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex gap-1">
                  <button onClick={selectAll} className="px-2 py-1 rounded border border-[var(--gold)]/40 hover:bg-[var(--gold)]/10">
                    {t("combat.manager.selectAll")}
                  </button>
                  <button onClick={deselect} className="px-2 py-1 rounded border border-[var(--gold)]/40 hover:bg-[var(--gold)]/10">
                    {t("combat.manager.deselect")}
                  </button>
                </div>
                <span className="text-muted-foreground">{t("combat.manager.selectedCount", { n: selectedList.length })}</span>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {filtered.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-6">{t("combat.manager.empty")}</p>
              )}
              {filtered.map(p => {
                const kind = classifyEntity(p);
                const isChecked = selected.has(p.id);
                const isActive = p.id === activeParticipantId;
                const extraTurns = pinCountByParticipant.get(p.id) || 0;
                const typeLabel =
                  kind === "enemy" ? t("combat.manager.typeEnemy") :
                  kind === "npc" ? t("combat.manager.typeNpc") :
                  kind === "copy" ? t("combat.manager.typeCopy") :
                  t("combat.manager.typeTemporary");
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                      isChecked ? "bg-[var(--gold)]/10 border-[var(--gold)]/60" : "border-[var(--gold)]/20 hover:bg-white/5"
                    }`}
                  >
                    <input type="checkbox" checked={isChecked} onChange={() => toggle(p.id)} className="accent-[var(--gold)]" />
                    <div
                      className="w-8 h-8 rounded-full overflow-hidden shrink-0 border-2 relative bg-card"
                      style={{ borderColor: p.color || p.enemy_color || "var(--gold)" }}
                    >
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="absolute inset-0 w-full h-full object-cover"
                          style={{
                            objectPosition: `${p.enemy_image_offset_x ?? 50}% ${p.enemy_image_offset_y ?? 50}%`,
                            transform: `scale(${p.enemy_image_scale ?? 1})`,
                          }} />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-xs">{p.enemy_icon || "❓"}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs font-medium truncate">{p.display_name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 uppercase tracking-wider">{typeLabel}</span>
                        {isActive && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--gold)] text-black uppercase tracking-wider">
                            {t("combat.manager.activeBadge")}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex flex-wrap gap-x-2">
                        <span>HP {p.enemy_hp ?? "?"}/{p.enemy_max_hp ?? "?"}</span>
                        <span>DEF {p.enemy_defense ?? 0}</span>
                        <span>INI {p.initiative}</span>
                        {extraTurns > 0 && <span className="text-[var(--gold)]">+{extraTurns} {t("combat.manager.extraTurnsShort")}</span>}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-[var(--gold)]/30 flex gap-2">
              <button onClick={onClose} className="flex-1 btn-fantasy text-xs py-2">
                {t("common.cancel")}
              </button>
              <button
                onClick={() => setConfirming(true)}
                disabled={selectedList.length === 0}
                className="flex-1 btn-fantasy text-xs py-2 disabled:opacity-50"
                style={{ background: "var(--loss)", color: "white" }}
              >
                <Trash2 size={12} className="inline mr-1" />
                {t("combat.manager.removeSelected")}
              </button>
            </div>
          </>
        ) : (
          /* Confirmation step */
          <div className="p-4 space-y-3 overflow-y-auto">
            <div className="flex items-center gap-2 text-[var(--loss)]">
              <AlertTriangle size={16} />
              <h3 className="font-display text-sm uppercase tracking-widest">{t("combat.manager.confirmTitle")}</h3>
            </div>
            <p className="text-xs">{t("combat.manager.confirmText")}</p>
            <ul className="text-[11px] list-disc pl-5 max-h-40 overflow-y-auto space-y-0.5">
              {selectedList.map(p => (
                <li key={p.id}>{p.display_name}</li>
              ))}
            </ul>
            <div className="space-y-1 text-[10px] text-muted-foreground border-t border-[var(--gold)]/20 pt-2">
              <p>• {t("combat.manager.warnTemplates")}</p>
              {selectedExtraTurnCount > 0 && (
                <p>• {t("combat.manager.warnExtraTurns", { n: selectedExtraTurnCount })}</p>
              )}
              {selectedHasActive && (
                <p className="text-[var(--loss)]">• {t("combat.manager.warnActive")}</p>
              )}
              <p>• {t("combat.manager.warnTemporary")}</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setConfirming(false)} disabled={working} className="flex-1 btn-fantasy text-xs py-2">
                {t("common.cancel")}
              </button>
              <button
                onClick={handleRemove}
                disabled={working}
                className="flex-1 btn-fantasy text-xs py-2 disabled:opacity-60"
                style={{ background: "var(--loss)", color: "white" }}
              >
                {working ? t("combat.manager.removing") : t("common.confirm")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

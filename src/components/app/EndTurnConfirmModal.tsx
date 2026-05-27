import { useState } from "react";
import { Flag, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { backdropProps } from "@/lib/modalBackdrop";
import { activeBlock, type CombatEncounter, type CombatParticipant, type CombatTurnGroup, type CombatTurnPin, type TurnBlock, buildOrderedTurns, isEnemy } from "@/lib/combat";

type Props = {
  encounter: CombatEncounter;
  participants: CombatParticipant[];
  groups: CombatTurnGroup[];
  pins: CombatTurnPin[];
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
};

function blockSummary(block: TurnBlock | null, t: ReturnType<typeof useT>["t"]) {
  if (!block) return { title: "—", subtitle: "", color: "#cccccc", image: null as string | null };
  if (block.kind === "solo") {
    const p = block.participant;
    const isE = isEnemy(p);
    return {
      title: p.display_name,
      subtitle: isE ? t("combat.enemyLabel") : t("combat.activePlayer"),
      color: p.color || p.enemy_color || "#cccccc",
      image: p.image_url || null,
    };
  }
  if (block.kind === "group") {
    const leader = block.members.find(m => m.is_leader) || block.members[0];
    return {
      title: t("combat.endTurn.linkGroup"),
      subtitle: block.members.map(m => m.display_name).join(", "),
      color: block.group.color || leader?.color || "var(--gold)",
      image: leader?.image_url || null,
    };
  }
  // pin
  return {
    title: t("combat.endTurn.extraTurnOf", { name: block.linked.display_name }),
    subtitle: t("combat.enemyLabel"),
    color: block.linked.color || block.linked.enemy_color || "var(--gold)",
    image: block.linked.image_url || null,
  };
}

export function EndTurnConfirmModal({ encounter, participants, groups, pins, onConfirm, onClose }: Props) {
  const { t } = useT();
  const [working, setWorking] = useState(false);
  const blocks = buildOrderedTurns(participants, groups, pins);
  const block = activeBlock(encounter, blocks);
  const info = blockSummary(block, t);

  const handle = async () => {
    if (working) return;
    setWorking(true);
    try {
      await onConfirm();
    } finally {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-3" {...backdropProps(onClose)}>
      <div className="ornate-card max-w-sm w-full p-4 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Flag size={14} className="text-[var(--gold)]" />
          <h3 className="font-display text-sm uppercase tracking-widest text-[var(--gold)] flex-1">
            {t("combat.endTurn.title")}
          </h3>
          <button onClick={onClose} disabled={working} className="p-1 rounded hover:bg-white/10" aria-label={t("common.close")}>
            <X size={14} />
          </button>
        </div>
        <p className="text-xs">{t("combat.endTurn.question")}</p>
        <div className="flex items-center gap-2 p-2 rounded border" style={{ borderColor: `color-mix(in oklab, ${info.color} 55%, transparent)` }}>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 relative bg-card shrink-0" style={{ borderColor: info.color }}>
            {info.image ? (
              <img src={info.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs">🎲</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: info.color }}>{info.title}</div>
            {info.subtitle && <div className="text-[10px] text-muted-foreground truncate">{info.subtitle}</div>}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} disabled={working} className="flex-1 btn-fantasy text-xs py-2">
            {t("common.cancel")}
          </button>
          <button onClick={handle} disabled={working} className="flex-1 btn-fantasy text-xs py-2 disabled:opacity-60"
            style={{ background: "var(--gradient-gold)", color: "oklch(0.15 0.03 25)" }}>
            {working ? t("combat.endTurn.resolving") : t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

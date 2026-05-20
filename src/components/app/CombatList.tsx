import { useT } from "@/lib/i18n";
import {
  activeBlock,
  blockContainsCharacter,
  buildOrderedTurns,
  type CombatEncounter,
  type CombatParticipant,
  type CombatTurnGroup,
  type TurnBlock,
} from "@/lib/combat";
import { Crown } from "lucide-react";

type Props = {
  encounter: CombatEncounter;
  participants: CombatParticipant[];
  groups: CombatTurnGroup[];
  selfCharacterId?: string | null;
  onOpenChar?: (id: string) => void;
};

export function CombatList({ encounter, participants, groups, selfCharacterId, onOpenChar }: Props) {
  const { t } = useT();
  const blocks = buildOrderedTurns(participants, groups);
  const active = activeBlock(encounter, blocks);

  if (blocks.length === 0) {
    return <p className="text-center text-xs text-muted-foreground py-4">{t("combat.empty")}</p>;
  }

  return (
    <div className="space-y-2">
      {blocks.map(b => (
        <TurnRow
          key={b.key}
          block={b}
          isActive={!!active && active.key === b.key}
          isSelf={selfCharacterId ? blockContainsCharacter(b, selfCharacterId) : false}
          activeLabel={t("combat.activePlayer")}
          enlaceLabel={t("combat.linkBadge")}
          onOpenChar={onOpenChar}
        />
      ))}
    </div>
  );
}

function TurnRow({
  block, isActive, isSelf, activeLabel, enlaceLabel, onOpenChar,
}: {
  block: TurnBlock; isActive: boolean; isSelf: boolean; activeLabel: string; enlaceLabel: string;
  onOpenChar?: (id: string) => void;
}) {
  const baseColor =
    block.kind === "solo" ? (block.participant.color || "var(--gold)") : (block.group.color || "var(--gold)");
  const containerStyle = {
    borderColor: isActive ? "var(--gold)" : `color-mix(in oklab, ${baseColor} 55%, transparent)`,
    background: `linear-gradient(180deg, color-mix(in oklab, ${baseColor} 12%, var(--card)), var(--card))`,
    boxShadow: isActive ? "0 0 0 1px var(--gold), 0 0 18px color-mix(in oklab, var(--gold) 35%, transparent)" : undefined,
  } as const;

  if (block.kind === "solo") {
    const p = block.participant;
    return (
      <div className="ornate-card !p-2 flex items-center gap-3 transition-shadow" style={containerStyle}>
        <Avatar p={p} onClick={() => onOpenChar?.(p.character_id)} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm truncate" style={{ color: p.color || undefined }}>
            {p.display_name}{isSelf && <span className="text-[10px] text-[var(--gain)] ml-1">●</span>}
          </p>
          <p className="text-[10px] text-muted-foreground">{p.has_ended_turn ? "—" : " "}</p>
        </div>
        <InitiativeChip n={p.initiative} />
        {isActive && <ActiveBadge label={activeLabel} />}
      </div>
    );
  }

  return (
    <div className="ornate-card !p-2 transition-shadow" style={containerStyle}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-display uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ background: `color-mix(in oklab, ${baseColor} 25%, transparent)`, color: baseColor }}>
          {enlaceLabel}
        </span>
        <div className="flex items-center gap-2">
          <InitiativeChip n={block.group.group_initiative} />
          {isActive && <ActiveBadge label={activeLabel} />}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        {block.members.map(m => (
          <div key={m.id} className="flex items-center gap-2">
            <Avatar p={m} small onClick={() => onOpenChar?.(m.character_id)} />
            <div className="min-w-0 flex-1 flex items-center gap-1">
              {m.is_leader && <Crown size={12} className="text-[var(--gold)]" />}
              <p className="font-display text-xs truncate" style={{ color: m.color || undefined }}>
                {m.display_name}
                {selfMatch(m, isSelf) && <span className="text-[10px] text-[var(--gain)] ml-1">●</span>}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function selfMatch(_p: CombatParticipant, isSelf: boolean) {
  return false && isSelf;
}

function Avatar({ p, small, onClick }: { p: CombatParticipant; small?: boolean; onClick?: () => void }) {
  const size = small ? "w-7 h-7" : "w-10 h-10";
  return (
    <button onClick={onClick} type="button"
      className={`${size} rounded-full overflow-hidden border-2 flex-shrink-0`}
      style={{ borderColor: p.color || "var(--gold)" }}>
      {p.image_url ? (
        <img src={p.image_url} alt={p.display_name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-[var(--secondary)] flex items-center justify-center text-sm">🧙</div>
      )}
    </button>
  );
}

function InitiativeChip({ n }: { n: number }) {
  return (
    <span className="font-display text-sm px-2 py-0.5 rounded border border-[var(--gold)]/60 text-[var(--gold)] bg-card">
      {n}
    </span>
  );
}

function ActiveBadge({ label }: { label: string }) {
  return (
    <span className="text-[9px] font-display uppercase tracking-widest px-2 py-0.5 rounded-full bg-[var(--gold)] text-black whitespace-nowrap">
      {label}
    </span>
  );
}

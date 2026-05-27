import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import {
  Edit3, Copy, Trash2, FastForward, Sword, Heart, Pin, ChevronDown, X,
} from "lucide-react";
import {
  activeBlock,
  addTurnPin,
  buildOrderedTurns,
  deleteTurnPin,
  dmEndEnemyTurn,
  isEnemy,
  removeEnemy,
  type CombatEncounter,
  type CombatParticipant,
  type CombatTurnGroup,
  type CombatTurnPin,
} from "@/lib/combat";
import {
  listEffectsForEnemy,
  tickEnemyEffect,
} from "@/lib/combat-skills";
import { EffectInfoModal } from "@/components/app/EffectInfoModal";
import { HpShieldBar } from "@/components/app/HpShieldBar";
import { useEncounterShields } from "@/hooks/useEncounterShields";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { EnemyIcon, getEnemyAssetUrl, getEnemyCustomImage } from "@/components/app/EnemyIconPicker";
import { EnemyEditorModal } from "@/components/app/EnemyEditorModal";
import { EnemyDamageModal } from "@/components/app/EnemyDamageModal";
import { EnemyAttackPlayersModal } from "@/components/app/EnemyAttackPlayersModal";
import { EnemyCombatSheetModal } from "@/components/app/EnemyCombatSheetModal";
import { EnemyDuplicateModal } from "@/components/app/EnemyDuplicateModal";
import { useLongPress } from "@/hooks/useLongPress";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";

type EffectRow = Tables<"combat_temporary_effects">;

type Props = {
  encounter: CombatEncounter;
  participants: CombatParticipant[];
  groups: CombatTurnGroup[];
  pins?: CombatTurnPin[];
  dm: { id: string; name: string; color: string };
};

export function EnemyManagerDM({ encounter, participants, groups, pins = [], dm }: Props) {
  const { t } = useT();
  const enemies = participants.filter(isEnemy).sort((a, b) => a.order_index - b.order_index);
  const blocks = buildOrderedTurns(participants, groups, pins);
  const active = activeBlock(encounter, blocks);
  const { byEnemyParticipant: shieldByEnemy } = useEncounterShields(encounter.id);

  const [editing, setEditing] = useState<CombatParticipant | null>(null);
  const [attacking, setAttacking] = useState<CombatParticipant | null>(null);
  const [healing, setHealing] = useState<CombatParticipant | null>(null);
  const [sheet, setSheet] = useState<CombatParticipant | null>(null);
  const [duplicating, setDuplicating] = useState<CombatParticipant | null>(null);
  const [removing, setRemoving] = useState<CombatParticipant | null>(null);
  const [removingPin, setRemovingPin] = useState<CombatTurnPin | null>(null);
  // Only one card has the action strip open at a time.
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);

  if (enemies.length === 0 && pins.length === 0) return null;

  // Pins grouped by linked enemy.
  const pinsByEnemy = new Map<string, CombatTurnPin[]>();
  for (const p of pins) {
    const arr = pinsByEnemy.get(p.linked_participant_id) || [];
    arr.push(p);
    pinsByEnemy.set(p.linked_participant_id, arr);
  }

  // Visual sort: keep the active entity (or the linked entity of an active pin)
  // at the top of the DM grid. Does NOT mutate combat order.
  const activeEntityId =
    active?.kind === "solo" && isEnemy(active.participant) ? active.participant.id
    : active?.kind === "pin" ? active.linked.id
    : null;
  const sortedEnemies = activeEntityId
    ? [...enemies].sort((a, b) => {
        if (a.id === activeEntityId) return -1;
        if (b.id === activeEntityId) return 1;
        return a.order_index - b.order_index;
      })
    : enemies;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">
        {t("combat.enemies")}
      </p>
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {sortedEnemies.map(p => {
          const isActiveSolo = active?.kind === "solo" && active.participant.id === p.id;
          const myPins = pinsByEnemy.get(p.id) || [];
          const activePin = active?.kind === "pin" && active.linked.id === p.id ? active.pin : null;
          const isActive = isActiveSolo || !!activePin;
          return (
            <EnemyCardCompact
              key={p.id}
              p={p}
              shield={shieldByEnemy[p.id] || 0}
              isActive={isActive}
              isExtraTurnActive={!!activePin}
              encounter={encounter}
              blocks={blocks}
              pins={myPins}
              actionsOpen={openActionsId === p.id}
              onToggleActions={() => setOpenActionsId(prev => (prev === p.id ? null : p.id))}
              onEdit={() => setEditing(p)}
              onDamage={() => setAttacking(p)}
              onHeal={() => setHealing(p)}
              onSheet={() => setSheet(p)}
              onDuplicate={() => setDuplicating(p)}
              onRemove={() => setRemoving(p)}
              onDeletePin={(pin) => setRemovingPin(pin)}
              onAddPin={async () => {
                const r = await addTurnPin(encounter, p);
                if (!r.ok) toast.error(t("combat.saveError"));
                else toast.success(t("combat.pinAdded"));
              }}
            />
          );
        })}
      </div>

      {editing && (
        <EnemyEditorModal encounter={encounter} dm={dm} editing={editing} onClose={() => setEditing(null)} />
      )}
      {attacking && (
        <EnemyAttackPlayersModal enemy={attacking} onClose={() => setAttacking(null)} />
      )}
      {healing && (
        <EnemyDamageModal participant={healing} mode="both" onClose={() => setHealing(null)} />
      )}
      {sheet && (
        <EnemyCombatSheetModal
          participant={sheet}
          encounter={encounter}
          participants={participants}
          groups={groups}
          pins={pins}
          onClose={() => setSheet(null)}
        />
      )}
      {duplicating && (
        <EnemyDuplicateModal
          enemy={duplicating}
          encounter={encounter}
          participants={participants}
          groups={groups}
          pins={pins}
          dm={dm}
          onClose={() => setDuplicating(null)}
        />
      )}
      <ConfirmDialog
        open={!!removing}
        title={t("combat.confirmRemoveEnemyTitle")}
        description={t("combat.confirmRemoveEnemy")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          const myPins = pinsByEnemy.get(removing.id) || [];
          await Promise.all(myPins.map(p => deleteTurnPin(p)));
          const r = await removeEnemy(removing, encounter, dm);
          if (!r.ok) toast.error(t("combat.saveError"));
          else toast.success(t(r.archived ? "combat.enemyArchivedToBestiary" : "combat.enemyRemoved"));
          setRemoving(null);
        }}
      />
      <ConfirmDialog
        open={!!removingPin}
        title={t("combat.confirmDeletePinTitle")}
        description={t("combat.confirmDeletePin")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onCancel={() => setRemovingPin(null)}
        onConfirm={async () => {
          if (!removingPin) return;
          const r = await deleteTurnPin(removingPin);
          if (!r.ok) toast.error(t("combat.saveError"));
          setRemovingPin(null);
        }}
      />
    </div>
  );
}

/** Maps an enemy participant to its glow accent color (npc disposition aware). */
function accentColorFor(p: CombatParticipant): string {
  const npcId = (p as any).npc_template_id as string | null | undefined;
  const disp = (p as any).npc_disposition as ("ally" | "neutral" | "hostile" | null | undefined);
  if (npcId) {
    if (disp === "hostile") return "var(--loss)";
    if (disp === "ally") return "var(--gain)";
    return "var(--gold)";
  }
  return p.enemy_color || "var(--loss)";
}

function EnemyCardCompact({
  p, shield, isActive, isExtraTurnActive, encounter, blocks, pins,
  actionsOpen, onToggleActions,
  onEdit, onDamage, onHeal, onSheet, onDuplicate, onRemove, onAddPin, onDeletePin,
}: {
  p: CombatParticipant;
  shield: number;
  isActive: boolean;
  isExtraTurnActive: boolean;
  encounter: CombatEncounter;
  blocks: ReturnType<typeof buildOrderedTurns>;
  pins: CombatTurnPin[];
  actionsOpen: boolean;
  onToggleActions: () => void;
  onEdit: () => void; onDamage: () => void; onHeal: () => void; onSheet: () => void;
  onDuplicate: () => void; onRemove: () => void; onAddPin: () => void;
  onDeletePin: (pin: CombatTurnPin) => void;
}) {
  const { t } = useT();
  const max = p.enemy_max_hp || 1;
  const cur = p.enemy_hp || 0;
  const baseColor = p.enemy_color || "var(--loss)";
  const accent = accentColorFor(p);
  const lp = useLongPress(onSheet, 450);
  const customImg = getEnemyCustomImage(p);
  const isTierAsset = !!customImg || !!getEnemyAssetUrl(p.enemy_icon);
  const isNpc = !!(p as any).npc_template_id;
  const disp = (p as any).npc_disposition as ("ally" | "neutral" | "hostile" | null | undefined);

  // Subdued styling for inactive cards; bold styling for active.
  const cardStyle: React.CSSProperties = isActive
    ? {
        borderColor: accent,
        background: `linear-gradient(180deg, color-mix(in oklab, ${accent} 18%, var(--card)), var(--card))`,
        boxShadow: `0 0 0 2px ${accent}, 0 0 20px color-mix(in oklab, ${accent} 55%, transparent), inset 0 0 24px color-mix(in oklab, ${accent} 14%, transparent)`,
        opacity: p.is_defeated ? 0.55 : 1,
      }
    : {
        borderColor: `color-mix(in oklab, ${baseColor} 45%, transparent)`,
        opacity: p.is_defeated ? 0.5 : 0.97,
      };

  return (
    <div className="ornate-card !p-2 transition flex flex-col gap-1.5" style={cardStyle}>
      {/* Header: avatar + name + INI + ACTIVE badge */}
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="relative w-[52px] h-[52px] rounded-full border-2 overflow-hidden flex items-center justify-center bg-card shrink-0 select-none"
          style={{ borderColor: baseColor, color: baseColor }}
          {...{ onMouseDown: lp.onMouseDown, onMouseUp: lp.onMouseUp, onMouseLeave: lp.onMouseLeave, onTouchStart: lp.onTouchStart, onTouchEnd: lp.onTouchEnd, onTouchCancel: lp.onTouchCancel }}
          onClick={() => { if (!lp.didLongPress()) onSheet(); }}
          title={t("combat.enemy.openSheet")}
        >
          <EnemyIcon name={p.enemy_icon} size={30} fill={isTierAsset} customImage={customImg} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="font-display text-sm leading-tight truncate flex-1" style={{ color: baseColor }}>
              {p.display_name}
            </p>
            <span className="font-display text-[11px] px-1.5 py-0.5 rounded border border-[var(--gold)]/60 text-[var(--gold)] bg-card shrink-0">
              {p.initiative}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            <span
              className="text-[9px] font-display uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={isNpc
                ? { background: `color-mix(in oklab, ${accent} 22%, transparent)`, color: accent, border: `1px solid ${accent}` }
                : { background: "color-mix(in oklab, var(--loss) 22%, transparent)", color: "var(--loss)" }}
            >
              {isNpc ? t("combat.npcLabel") : t("combat.enemyLabel")}
            </span>
            {isNpc && disp && (
              <span className="text-[9px] font-display uppercase tracking-widest px-1.5 py-0.5 rounded"
                style={{ background: `color-mix(in oklab, ${accent} 14%, transparent)`, color: accent, border: `1px solid ${accent}` }}>
                {t(`npcs.disp_${disp}`)}
              </span>
            )}
            {isActive && (
              <span className="text-[9px] font-display uppercase tracking-widest px-1.5 py-0.5 rounded-full whitespace-nowrap"
                style={{ background: accent, color: "white" }}>
                {t("combat.activeTurnBadge")}
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wider mt-0.5">
            DEF {p.enemy_defense || 0} · SPD {p.enemy_speed || "—"}
          </p>
        </div>
      </div>

      {/* HP bar with inline text */}
      <div className="space-y-0.5">
        <HpShieldBar current={cur} max={max} shield={shield} height={8} hideLabel />
        <p className="text-[10px] text-muted-foreground font-display text-center leading-none">
          {cur} / {max} HP{shield > 0 && <span className="ml-1.5 text-cyan-300">· 🛡️ +{shield}</span>}
        </p>
      </div>

      {/* Effects strip */}
      <EnemyEffectsStrip participantId={p.id} encounterId={encounter.id} />

      {/* Extra-turn chips */}
      {pins.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[9px] font-display uppercase tracking-widest text-muted-foreground">
            {pins.length === 1 ? t("combat.extraTurnsCountOne") : t("combat.extraTurnsCount", { n: pins.length })}
          </span>
          {pins.map(pin => {
            const pinActive = isExtraTurnActive && pins.find(x => x.id === pin.id) && (blocks.some(b => b.kind === "pin" && b.pin.id === pin.id));
            return (
              <span key={pin.id}
                className="inline-flex items-center gap-1 text-[10px] font-display px-1.5 py-0.5 rounded-full border"
                style={pinActive
                  ? { background: `color-mix(in oklab, ${accent} 30%, transparent)`, color: "white", borderColor: accent }
                  : { background: "color-mix(in oklab, var(--card) 80%, transparent)", color: baseColor, borderColor: `color-mix(in oklab, ${baseColor} 55%, transparent)` }}>
                <Pin size={10} />
                {pin.initiative}
                <button type="button" onClick={() => onDeletePin(pin)} title={t("combat.deletePin")} className="opacity-70 hover:opacity-100">
                  <X size={10} />
                </button>
              </span>
            );
          })}
          {isExtraTurnActive && (
            <span className="text-[9px] font-display uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: accent, color: "white" }}>
              {t("combat.extraTurnActive")}
            </span>
          )}
        </div>
      )}

      {/* End-turn button (prominent when active) */}
      {isActive && !p.is_defeated && (
        <button
          className="btn-fantasy w-full text-xs py-1.5 flex items-center justify-center gap-1.5 font-display"
          style={{ background: "var(--gradient-gold)", color: "oklch(0.15 0.03 25)" }}
          onClick={() => dmEndEnemyTurn(encounter, blocks)}>
          <FastForward size={13} /> {t("combat.endEnemyTurn")}
        </button>
      )}

      {/* Compact action row: Actions toggle + Add extra turn */}
      {!actionsOpen ? (
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            className="btn-fantasy text-[11px] py-1 flex items-center justify-center gap-1 font-display uppercase tracking-wider"
            style={{
              background: "linear-gradient(180deg, oklch(0.32 0.10 250), oklch(0.22 0.08 250))",
              color: "white",
              borderColor: "oklch(0.45 0.10 240)",
            }}
            onClick={onToggleActions}
            aria-expanded={false}
          >
            <ChevronDown size={12} /> {t("combat.actions")}
          </button>
          <button
            type="button"
            className="btn-fantasy text-[11px] py-1 flex items-center justify-center gap-1 font-display uppercase tracking-wider border border-dashed"
            style={{ background: "transparent", borderColor: `color-mix(in oklab, ${baseColor} 55%, transparent)`, color: baseColor }}
            onClick={onAddPin}
            title={t("combat.addTurnPinHint")}
          >
            <Pin size={12} /> {t("combat.addTurnPin")}
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="grid grid-cols-5 gap-1">
            <IconBtn label={t("combat.damage")} icon={<Sword className="w-[55%] h-[55%]" strokeWidth={2.2} />} bg="color-mix(in oklab, var(--loss) 70%, var(--card))" onClick={onDamage} />
            <IconBtn label={t("combat.heal")} icon={<Heart className="w-[55%] h-[55%]" strokeWidth={2.2} />} bg="color-mix(in oklab, var(--gain) 70%, var(--card))" onClick={onHeal} />
            <IconBtn label={t("combat.edit")} icon={<Edit3 className="w-[55%] h-[55%]" strokeWidth={2.2} />} bg="color-mix(in oklab, oklch(0.55 0.12 240) 55%, var(--card))" onClick={onEdit} />
            <IconBtn label={t("combat.duplicate.label")} icon={<Copy className="w-[55%] h-[55%]" strokeWidth={2.2} />} bg="color-mix(in oklab, oklch(0.45 0.10 240) 60%, var(--card))" onClick={onDuplicate} />
            <IconBtn label={t("combat.remove")} icon={<Trash2 className="w-[55%] h-[55%]" strokeWidth={2.2} />} bg="color-mix(in oklab, var(--loss) 55%, black)" onClick={onRemove} />
          </div>
          <button
            type="button"
            className="btn-fantasy w-full text-[10px] py-1 flex items-center justify-center gap-1 font-display uppercase tracking-wider"
            style={{ background: "transparent", borderStyle: "dashed", color: "var(--muted-foreground)" }}
            onClick={onToggleActions}
          >
            <X size={11} /> {t("combat.hideActions")}
          </button>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  label, icon, bg, color, onClick,
}: { label: string; icon: React.ReactNode; bg: string; color?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="btn-fantasy aspect-square w-full !p-0 flex items-center justify-center min-h-[34px]"
      style={{ background: bg, color: color || "white" }}
      onClick={onClick}
      title={label}
      aria-label={label}>
      {icon}
    </button>
  );
}

// ─────────────────── Effects strip ───────────────────

/**
 * Effect labels are stored as "{emoji} {localized label}" when applied from
 * ConditionsPanel. Extract the leading emoji (everything before the first
 * space). Fall back to a small map by effect_type, then "✨".
 */
function emojiForEffect(e: EffectRow): string {
  const raw = (e.label || "").trim();
  if (raw) {
    // Take the first whitespace-separated token. It should be the emoji.
    const first = raw.split(/\s+/)[0] || "";
    // Heuristic: if it contains no ASCII letters/digits, treat as the emoji.
    if (first && !/[a-z0-9]/i.test(first)) return first;
  }
  const type = (e.effect_type || "").toLowerCase();
  if (type === "shield") return "🛡️";
  if (type === "note") return "📜";
  if (type === "buff") return "✨";
  if (type === "control") return "💫";
  if (type === "debuff") return "☠️";
  return "✨";
}

/** Strip the leading emoji from a stored label, returning just the text. */
function textOfEffectLabel(e: EffectRow): string {
  const raw = (e.label || "").trim();
  if (!raw) return e.effect_type || "";
  const parts = raw.split(/\s+/);
  if (parts.length > 1 && !/[a-z0-9]/i.test(parts[0])) {
    return parts.slice(1).join(" ");
  }
  return raw;
}

function EnemyEffectsStrip({ participantId, encounterId }: { participantId: string; encounterId: string }) {
  const { t } = useT();
  const [effects, setEffects] = useState<EffectRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [info, setInfo] = useState<EffectRow | null>(null);

  const load = async () => {
    const rows = await listEffectsForEnemy(participantId);
    setEffects(rows);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`enemy-fx-${participantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "combat_temporary_effects", filter: `encounter_id=eq.${encounterId}` },
        () => { load(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantId, encounterId]);

  if (effects.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 pt-0.5">
      {effects.map(e => (
        <EnemyEffectChip
          key={e.id}
          row={e}
          disabled={busy === e.id}
          onTick={async () => {
            if (busy) return;
            setBusy(e.id);
            try { await tickEnemyEffect(e.id); } finally { setBusy(null); load(); }
          }}
          onInfo={() => setInfo(e)}
          tickLabel={t("combat.effects.reduce")}
        />
      ))}
      {info && (
        <EffectInfoModal effect={{ kind: "temporary", row: info }} onClose={() => setInfo(null)} />
      )}
    </div>
  );
}

function EnemyEffectChip({
  row, disabled, onTick, onInfo, tickLabel,
}: {
  row: EffectRow;
  disabled: boolean;
  onTick: () => void;
  onInfo: () => void;
  tickLabel: string;
}) {
  const emoji = emojiForEffect(row);
  const dur = typeof row.duration_rounds === "number" ? row.duration_rounds : null;
  const dmg = Math.max(0, Math.floor(row.value || 0));
  const text = textOfEffectLabel(row);
  const title = `${text}${dmg > 0 ? ` · -${dmg}/t` : ""}${dur !== null ? ` · ${dur}t` : ""} — ${tickLabel}`;
  const lp = useLongPress(onInfo, 500);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => { if (!lp.didLongPress()) onTick(); }}
      onContextMenu={(ev) => { ev.preventDefault(); onInfo(); }}
      onMouseDown={lp.onMouseDown}
      onMouseUp={lp.onMouseUp}
      onMouseLeave={lp.onMouseLeave}
      onTouchStart={lp.onTouchStart}
      onTouchEnd={lp.onTouchEnd}
      onTouchCancel={lp.onTouchCancel}
      className="relative w-8 h-8 rounded-md border border-border bg-card hover:border-[var(--gold)]/60 flex items-center justify-center text-base leading-none disabled:opacity-50"
      title={title}
      aria-label={title}
    >
      <span>{emoji}</span>
      {dur !== null && (
        <span className="absolute -bottom-1 -right-1 min-w-[14px] h-[14px] px-[3px] rounded-full bg-secondary border border-border text-[8px] font-display leading-none flex items-center justify-center">
          {dur}
        </span>
      )}
    </button>
  );
}


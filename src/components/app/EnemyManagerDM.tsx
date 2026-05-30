import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import {
  Edit3, Copy, Trash2, FastForward, Sword, Heart, Pin, ChevronDown, X, Plus, BookOpen,
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
import { BestiaryPickerModal } from "@/components/app/BestiaryPickerModal";
import { useLongPress } from "@/hooks/useLongPress";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";

type EffectRow = Tables<"combat_temporary_effects">;

type Props = {
  encounter: CombatEncounter;
  participants: CombatParticipant[];
  groups: CombatTurnGroup[];
  pins?: CombatTurnPin[];
  dm: { id: string; name: string; color: string };
  campaignId?: string; // Added to support Bestiary
};

export function EnemyManagerDM({ encounter, participants, groups, pins = [], dm, campaignId }: Props) {
  const { t } = useT();
  const enemies = participants.filter(isEnemy).sort((a, b) => a.order_index - b.order_index);
  const blocks = buildOrderedTurns(participants, groups, pins);
  const active = activeBlock(encounter, blocks);
  const { byEnemyParticipant: shieldByEnemy } = useEncounterShields(encounter.id);

  const [addingEnemy, setAddingEnemy] = useState(false);
  const [pickingTemplate, setPickingTemplate] = useState(false);
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

  // FASE 7: Identify active entity
  const activeEntityId =
    active?.kind === "solo" && isEnemy(active.participant) ? active.participant.id
    : active?.kind === "pin" ? active.linked.id
    : null;

  const activeParticipant = activeEntityId ? enemies.find(e => e.id === activeEntityId) : null;
  const waitingEnemies = enemies.filter(e => e.id !== activeEntityId);

  return (
    <div className="space-y-6">
      {/* Top action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          className="btn-fantasy text-xs py-2 uppercase tracking-widest font-bold"
          style={{ background: "color-mix(in oklab, var(--loss) 45%, var(--card))", color: "white" }}
          onClick={() => setAddingEnemy(true)}
        >
          <Plus size={14} className="inline mr-1" /> {t("combat.addEnemy")}
        </button>
        <button
          className="btn-fantasy text-xs py-2 uppercase tracking-widest font-bold"
          style={{ background: "color-mix(in oklab, var(--gold) 35%, var(--card))", color: "white" }}
          onClick={() => setPickingTemplate(true)}
        >
          <BookOpen size={14} className="inline mr-1" /> {t("bestiary.addFromBestiary")}
        </button>
      </div>

      {/* Active Entity Section */}
      <div className="space-y-3">
        <h3 className="font-display text-[11px] uppercase tracking-[0.2em] text-[var(--gold)]">
          {activeParticipant ? t("combat.manager.activeSection") : t("combat.manager.noActive")}
        </h3>
        {activeParticipant && (
          <ActiveEnemyCombatCard
            p={activeParticipant}
            shield={shieldByEnemy[activeParticipant.id] || 0}
            encounter={encounter}
            blocks={blocks}
            pins={pinsByEnemy.get(activeParticipant.id) || []}
            isExtraTurnActive={active?.kind === "pin" && active.linked.id === activeParticipant.id}
            onEdit={() => setEditing(activeParticipant)}
            onDamage={() => setAttacking(activeParticipant)}
            onHeal={() => setHealing(activeParticipant)}
            onSheet={() => setSheet(activeParticipant)}
            onDuplicate={() => setDuplicating(activeParticipant)}
            onRemove={() => setRemoving(activeParticipant)}
            onDeletePin={(pin: CombatTurnPin) => setRemovingPin(pin)}
            onAddPin={async () => {
              const r = await addTurnPin(encounter, activeParticipant);
              if (!r.ok) toast.error(t("combat.saveError"));
              else toast.success(t("combat.pinAdded"));
            }}
          />
        )}
      </div>

      {/* Waiting Entities Section */}
      {waitingEnemies.length > 0 && (
        <div className="space-y-3">
          <div className="h-px bg-white/10 w-full" />
          <h3 className="font-display text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {t("combat.manager.waitingSection")}
          </h3>
          <div className="grid gap-3 grid-cols-3">
            {waitingEnemies.map(p => {
              const myPins = pinsByEnemy.get(p.id) || [];
              return (
                <CompactEnemyCombatCard
                  key={p.id}
                  p={p}
                  shield={shieldByEnemy[p.id] || 0}
                  encounter={encounter}
                  pins={myPins}
                  isExpanded={openActionsId === p.id}
                  onToggleActions={() => setOpenActionsId(prev => (prev === p.id ? null : p.id))}
                  onEdit={() => setEditing(p)}
                  onDamage={() => setAttacking(p)}
                  onHeal={() => setHealing(p)}
                  onSheet={() => setSheet(p)}
                  onDuplicate={() => setDuplicating(p)}
                  onRemove={() => setRemoving(p)}
                  onDeletePin={(pin: CombatTurnPin) => setRemovingPin(pin)}
                  onAddPin={async () => {
                    const r = await addTurnPin(encounter, p);
                    if (!r.ok) toast.error(t("combat.saveError"));
                    else toast.success(t("combat.pinAdded"));
                  }}
                />
              );
            })}
          </div>
        </div>
      )}


      {addingEnemy && (
        <EnemyEditorModal encounter={encounter} dm={dm} onClose={() => setAddingEnemy(false)} />
      )}
      {pickingTemplate && campaignId && (
        <BestiaryPickerModal
          campaignId={campaignId}
          encounter={encounter}
          dm={dm}
          onClose={() => setPickingTemplate(false)}
        />
      )}
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
function accentColorFor(p: CombatParticipant): { color: string; intense: boolean } {
  const isBoss = p.tier?.toLowerCase() === "boss" || p.tier?.toLowerCase() === "god";
  
  if (p.npc_template_id) {
    if (p.npc_disposition === "hostile") return { color: "var(--loss)", intense: isBoss };
    if (p.npc_disposition === "ally") return { color: "var(--gain)", intense: isBoss };
    return { color: "var(--gold)", intense: isBoss };
  }
  
  return { color: p.enemy_color || "var(--loss)", intense: isBoss };
}

/** FASE 7: Large card for the active entity */
function ActiveEnemyCombatCard({
  p, shield, encounter, blocks, pins, isExtraTurnActive,
  onEdit, onDamage, onHeal, onSheet, onDuplicate, onRemove, onAddPin, onDeletePin,
}: {
  p: CombatParticipant;
  shield: number;
  encounter: CombatEncounter;
  blocks: ReturnType<typeof buildOrderedTurns>;
  pins: CombatTurnPin[];
  isExtraTurnActive: boolean;
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
  const isNpc = !!p.npc_template_id;
  const disp = p.npc_disposition;

  // FASE 7: Enhanced glow for active card
  const glowStyle: React.CSSProperties = {
    borderColor: accent.color,
    background: `linear-gradient(180deg, color-mix(in oklab, ${accent.color} 18%, var(--card)), var(--card))`,
    boxShadow: `0 0 0 ${accent.intense ? '3px' : '2px'} ${accent.color}, 0 0 ${accent.intense ? '40px' : '20px'} color-mix(in oklab, ${accent.color} 55%, transparent), inset 0 0 24px color-mix(in oklab, ${accent.color} 14%, transparent)`,
    opacity: p.is_defeated ? 0.55 : 1,
  };

  const [showActions, setShowActions] = useState(false);

  return (
    <div className="ornate-card !p-4 transition flex flex-col gap-4 relative overflow-hidden" 
      style={{ 
        borderColor: accent.color, 
        background: `linear-gradient(180deg, color-mix(in oklab, ${accent.color} 10%, #0d0d0d), #0d0d0d)`,
        boxShadow: `0 0 30px color-mix(in oklab, ${accent.color} 20%, transparent)`,
        opacity: p.is_defeated ? 0.6 : 1
      }}>
      
      {/* Initiative Box */}
      <div className="absolute top-4 right-4 bg-black/60 border border-[var(--gold)]/40 px-3 py-1 rounded-lg">
        <span className="font-display text-[var(--gold)] text-lg">{p.initiative}</span>
      </div>

      <div className="flex items-center gap-5">
        <button
          type="button"
          className="relative w-24 h-24 rounded-full border-4 overflow-hidden flex items-center justify-center bg-black shrink-0 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
          style={{ borderColor: baseColor }}
          onClick={onSheet}
        >
          <EnemyIcon name={p.enemy_icon} size={56} fill={isTierAsset} customImage={customImg} />
        </button>
        <div className="flex-1 min-w-0 pr-10">
          <h3 className="font-display text-2xl leading-none truncate mb-1" style={{ color: "white" }}>
            {p.display_name}
          </h3>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-display uppercase tracking-[0.2em] px-2 py-0.5 rounded bg-red-950/40 text-red-500 border border-red-500/30">
              {isNpc ? t("combat.npcLabel") : t("combat.enemyLabel")}
            </span>
            <span className="text-[10px] font-display uppercase tracking-[0.2em] px-2 py-0.5 rounded bg-[var(--gold)] text-black font-bold">
              {t("combat.manager.activeBadge")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-display uppercase tracking-widest opacity-70">
            DEF {p.enemy_defense || 0} · SPD {p.enemy_speed || "—"}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
          <div className="h-full bg-green-500 transition-all shadow-[0_0_10px_rgba(34,197,94,0.3)]" style={{ width: `${(cur/max)*100}%` }} />
        </div>
        <div className="flex justify-center text-[10px] text-white/60 font-display tracking-widest uppercase">
          {cur} / {max} HP {shield > 0 && <span className="ml-2 text-cyan-400">🛡️ +{shield}</span>}
        </div>
      </div>

      <EnemyEffectsStrip participantId={p.id} encounterId={encounter.id} />

      <div className="space-y-3">
        <button
          className="btn-fantasy w-full py-3.5 flex items-center justify-center gap-3 font-display text-base font-bold shadow-xl transition-all hover:brightness-110 active:scale-[0.98]"
          style={{ background: "linear-gradient(180deg, #eab308, #ca8a04)", color: "black" }}
          onClick={() => dmEndEnemyTurn(encounter, blocks)}>
          <FastForward size={20} /> {t("combat.endEnemyTurn")}
        </button>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            className="btn-fantasy py-3 flex items-center justify-center gap-2 font-display text-sm bg-blue-950/40 border-blue-500/30 text-blue-400"
            onClick={() => setShowActions(!showActions)}>
            <ChevronDown size={18} className={showActions ? "rotate-180 transition-transform" : "transition-transform"} /> 
            {t("combat.actions")}
          </button>
          <button
            className="btn-fantasy py-3 flex items-center justify-center gap-2 font-display text-sm border-dashed bg-transparent border-red-500/40 text-red-500"
            onClick={onAddPin}>
            <Pin size={18} /> {t("combat.addTurnPin")}
          </button>
        </div>
      </div>

      {showActions && (
        <div className="grid grid-cols-5 gap-2 pt-2 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
          <IconBtn label={t("combat.damage")} icon={<Sword className="w-5 h-5" />} bg="color-mix(in oklab, var(--loss) 70%, #0d0d0d)" onClick={onDamage} />
          <IconBtn label={t("combat.heal")} icon={<Heart className="w-5 h-5" />} bg="color-mix(in oklab, var(--gain) 70%, #0d0d0d)" onClick={onHeal} />
          <IconBtn label={t("combat.edit")} icon={<Edit3 className="w-5 h-5" />} bg="color-mix(in oklab, #3b82f6 55%, #0d0d0d)" onClick={onEdit} />
          <IconBtn label={t("combat.duplicate.label")} icon={<Copy className="w-5 h-5" />} bg="color-mix(in oklab, #8b5cf6 60%, #0d0d0d)" onClick={onDuplicate} />
          <IconBtn label={t("combat.remove")} icon={<Trash2 className="w-5 h-5" />} bg="#991b1b" onClick={onRemove} />
        </div>
      )}
    </div>
  );
}
}

/** FASE 7: Compact card for the waiting entities */
function CompactEnemyCombatCard({
  p, shield, encounter, pins, isExpanded, onToggleActions,
  onEdit, onDamage, onHeal, onSheet, onDuplicate, onRemove, onAddPin, onDeletePin,
}: {
  p: CombatParticipant;
  shield: number;
  encounter: CombatEncounter;
  pins: CombatTurnPin[];
  isExpanded: boolean;
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
  const isNpc = !!p.npc_template_id;

  if (isExpanded) {
    return (
      <div className="ornate-card !p-3 transition flex flex-col gap-2"
        style={{ borderColor: accent.color, opacity: p.is_defeated ? 0.6 : 1 }}>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full border overflow-hidden flex items-center justify-center shrink-0"
            style={{ borderColor: baseColor }}>
            <EnemyIcon name={p.enemy_icon} size={24} fill={isTierAsset} customImage={customImg} />
          </div>
          <p className="font-display text-sm truncate flex-1" style={{ color: baseColor }}>{p.display_name}</p>
          <button type="button" onClick={onToggleActions} className="text-muted-foreground hover:text-white">
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          <IconBtn label={t("combat.damage")} icon={<Sword className="w-4 h-4" />} bg="color-mix(in oklab, var(--loss) 70%, var(--card))" onClick={onDamage} />
          <IconBtn label={t("combat.heal")} icon={<Heart className="w-4 h-4" />} bg="color-mix(in oklab, var(--gain) 70%, var(--card))" onClick={onHeal} />
          <IconBtn label={t("combat.edit")} icon={<Edit3 className="w-4 h-4" />} bg="color-mix(in oklab, oklch(0.55 0.12 240) 55%, var(--card))" onClick={onEdit} />
          <IconBtn label={t("combat.duplicate.label")} icon={<Copy className="w-4 h-4" />} bg="color-mix(in oklab, oklch(0.45 0.10 240) 60%, var(--card))" onClick={onDuplicate} />
          <IconBtn label={t("combat.remove")} icon={<Trash2 className="w-4 h-4" />} bg="color-mix(in oklab, var(--loss) 55%, black)" onClick={onRemove} />
        </div>
        <button
          type="button"
          className="btn-fantasy w-full text-[10px] py-1 font-display uppercase tracking-widest border-dashed"
          style={{ background: "transparent", color: "var(--muted-foreground)" }}
          onClick={onToggleActions}
        >
          {t("combat.hideActions")}
        </button>
      </div>
    );
  }

  return (
    <div className="ornate-card !p-2 transition flex flex-col gap-1.5"
      style={{ borderColor: `color-mix(in oklab, ${baseColor} 30%, transparent)`, opacity: p.is_defeated ? 0.5 : 1 }}>
      <p className="font-display text-xs truncate" style={{ color: baseColor }}>{p.display_name}</p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="relative w-10 h-10 rounded-full border overflow-hidden flex items-center justify-center bg-card shrink-0"
          style={{ borderColor: baseColor, color: baseColor }}
          onMouseDown={lp.onMouseDown}
          onMouseUp={lp.onMouseUp}
          onMouseLeave={lp.onMouseLeave}
          onTouchStart={lp.onTouchStart}
          onTouchEnd={lp.onTouchEnd}
          onTouchCancel={lp.onTouchCancel}
          onClick={() => { if (!lp.didLongPress()) onSheet(); }}
        >
          <EnemyIcon name={p.enemy_icon} size={24} fill={isTierAsset} customImage={customImg} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] text-muted-foreground font-display uppercase tracking-wider">
            DEF {p.enemy_defense || 0} · SPD {p.enemy_speed || "—"}
          </p>
          <div className="mt-1">
            <HpShieldBar current={cur} max={max} shield={shield} height={6} hideLabel />
            <p className="text-[9px] text-muted-foreground font-display text-center mt-0.5">
              {cur} / {max} HP
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-wrap mt-0.5 min-h-[16px]">
        <span className="text-[8px] font-display uppercase px-1 rounded border"
          style={{ background: `color-mix(in oklab, ${accent.color} 20%, transparent)`, color: accent.color, borderColor: accent.color }}>
          {isNpc ? t("combat.npcLabel") : t("combat.enemyLabel")}
        </span>
        <span className="text-[8px] font-display px-1 rounded border border-[var(--gold)]/40 text-[var(--gold)]">
          {p.initiative}
        </span>
        <EnemyEffectMiniChips participantId={p.id} encounterId={encounter.id} />
      </div>

      <div className="grid grid-cols-5 gap-1 pt-1">
        <button
          type="button"
          className="col-span-4 btn-fantasy text-[9px] py-0.5 flex items-center justify-center gap-1 font-display uppercase tracking-widest"
          style={{ background: "linear-gradient(180deg, oklch(0.32 0.10 250), oklch(0.22 0.08 250))", color: "white" }}
          onClick={onToggleActions}
        >
          {t("combat.actions")}
        </button>
        <button
          type="button"
          className="btn-fantasy !p-0 flex items-center justify-center border-dashed"
          style={{ background: "transparent", borderColor: `color-mix(in oklab, ${baseColor} 40%, transparent)`, color: baseColor }}
          onClick={onAddPin}
        >
          <Pin size={10} />
        </button>
      </div>
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
    const parts = raw.split(/\s+/);
    const first = parts[0] || "";
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

/** FASE 7: Mini version of effects for compact cards */
function EnemyEffectMiniChips({ participantId, encounterId }: { participantId: string; encounterId: string }) {
  const [effects, setEffects] = useState<EffectRow[]>([]);

  const load = async () => {
    const rows = await listEffectsForEnemy(participantId);
    setEffects(rows);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`enemy-fx-mini-${participantId}`)
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

  // Show max 3 icons then +N
  const visible = effects.slice(0, 3);
  const extra = effects.length > 3 ? effects.length - 3 : 0;

  return (
    <div className="flex items-center gap-0.5">
      {visible.map(e => (
        <span key={e.id} className="text-[10px]" title={e.label || ""}>{emojiForEffect(e)}</span>
      ))}
      {extra > 0 && <span className="text-[8px] text-muted-foreground">+{extra}</span>}
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

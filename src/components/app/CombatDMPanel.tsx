import { useState } from "react";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { Swords, Flag, Play, ChevronRight, X, Plus, BookOpen, Sparkles, Users, Settings2, Shield, EyeOff, List, Info } from "lucide-react";
import { BestiaryPickerModal } from "@/components/app/BestiaryPickerModal";
import { DMApplyEffectModal } from "@/components/app/DMApplyEffectModal";
import { CombatManagerModal } from "@/components/app/CombatManagerModal";
import { EndTurnConfirmModal } from "@/components/app/EndTurnConfirmModal";
import {
  buildOrderedTurns,

  cancelInitiative,
  dissolveLink,
  endActiveTurn,
  endCombat,
  requestInitiative,

  reorderBlockWithAutoInitiative,
  startCombat,
  type CombatEncounter,
  type CombatParticipant,
  type CombatTurnGroup,
  type CombatTurnPin,
} from "@/lib/combat";
import { CombatList } from "@/components/app/CombatList";
import { Crown, Link as LinkIcon } from "lucide-react";
import { EnemyEditorModal } from "@/components/app/EnemyEditorModal";
import { EnemyManagerDM } from "@/components/app/EnemyManagerDM";
import { backdropProps } from "@/lib/modalBackdrop";
import { CombatSummaryModal } from "@/components/app/CombatSummaryModal";



type Props = {
  campaignId: string;
  dm: { id: string; name: string; color: string };
  encounter: CombatEncounter | null;
  participants: CombatParticipant[];
  groups: CombatTurnGroup[];
  pins?: CombatTurnPin[];
};

export function CombatDMPanel({ campaignId, dm, encounter, participants, groups, pins = [] }: Props) {
  const { t } = useT();
  const status = encounter?.status ?? null;
  const [addingEnemy, setAddingEnemy] = useState(false);
  const [pickingTemplate, setPickingTemplate] = useState(false);
  const [applyingEffect, setApplyingEffect] = useState(false);
  const [confirmState, setConfirmState] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [showManager, setShowManager] = useState(false);
  const [confirmingEndTurn, setConfirmingEndTurn] = useState(false);
  const [endingTurn, setEndingTurn] = useState(false);
  const [endSummary, setEndSummary] = useState<any[] | null>(null);



  const canAddEnemy = encounter && status !== "ended";

  return (
    <div className="ornate-card p-2 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Swords size={14} className="text-[var(--gold)]" />
        <h3 className="font-display text-xs uppercase tracking-widest text-[var(--gold)]">{t("combat.dmTitle")}</h3>
      </div>

      {(!encounter || status === "ended") && (
        <button className="btn-fantasy w-full text-xs py-1.5" style={{ background: "var(--gradient-gold)", color: "oklch(0.15 0.03 25)" }}
          onClick={async () => {
            const r = await requestInitiative(campaignId, dm);
            if (!r.ok) toast.error(t("combat.requestError"));
            else toast.success(t("combat.requested"));
          }}>
          <Flag size={12} className="inline mr-1" /> {t("combat.requestInitiative")}
        </button>
      )}


      {encounter && groups.length > 0 && status !== "ended" && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <LinkIcon size={12} className="text-[var(--gold)]" />
            <span className="text-[10px] font-display uppercase tracking-widest text-[var(--gold)]">{t("combat.linkActiveTitle")}</span>
          </div>
          {groups.map(g => {
            const members = participants.filter(p => p.turn_group_id === g.id);
            return (
              <div key={g.id} className="ornate-card !p-2 flex items-center gap-2"
                style={{ borderColor: `color-mix(in oklab, ${g.color || "var(--gold)"} 55%, transparent)` }}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1">
                    {members.map(m => (
                      <span key={m.id} className="text-[11px] flex items-center gap-0.5" style={{ color: m.color || undefined }}>
                        {m.is_leader && <Crown size={10} className="text-[var(--gold)]" />}
                        {m.display_name}
                      </span>
                    ))}
                  </div>
                </div>
                <button className="text-[10px] px-2 py-1 rounded border border-[var(--loss)]/60 text-[var(--loss)]"
                  onClick={() => setConfirmState({
                    message: t("combat.linkConfirmDissolve"),
                    onConfirm: async () => {
                      const r = await dissolveLink(g, dm);
                      if (!r.ok) toast.error(t("combat.linkError"));
                      else toast.success(t("combat.linkDissolved"));
                    },
                  })}>
                  {t("combat.linkDissolve")}
                </button>
              </div>
            );
          })}
        </div>
      )}


      {status === "collecting" && encounter && (
        <>
          <p className="text-[11px] text-muted-foreground">{t("combat.collectingHint", { n: participants.length })}</p>
          <div className="ornate-card !p-2 space-y-1.5">
            <p className="text-[10px] font-display uppercase tracking-widest text-[var(--gold)]">{t("combat.round")}</p>
            <CombatList encounter={encounter} participants={participants} groups={groups} pins={pins}
              onReorder={async (key, toIndex) => {
                const r = await reorderBlockWithAutoInitiative(encounter, buildOrderedTurns(participants, groups, pins), key, toIndex);
                if (!r.ok) toast.error(t("combat.reorderError") || "Reorder failed");
              }} />
          </div>
          <div className="ornate-card !p-2 space-y-2">
            {canAddEnemy && (
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-fantasy text-xs"
                  style={{ background: "color-mix(in oklab, var(--loss) 45%, var(--card))", color: "white" }}
                  onClick={() => setAddingEnemy(true)}>
                  <Plus size={12} className="inline mr-1" /> {t("combat.addEnemy")}
                </button>
                <button className="btn-fantasy text-xs"
                  style={{ background: "color-mix(in oklab, var(--gold) 35%, var(--card))", color: "white" }}
                  onClick={() => setPickingTemplate(true)}>
                  <BookOpen size={12} className="inline mr-1" /> {t("bestiary.addFromBestiary")}
                </button>
              </div>
            )}
            <EnemyManagerDM encounter={encounter} participants={participants} groups={groups} pins={pins} dm={dm} />
          </div>
          <div className="gem-divider opacity-40" />

          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-display text-[10px] uppercase tracking-widest text-[var(--gold)] flex items-center gap-1.5">
                <Settings2 size={12} /> {t("combat.settings.logDetailTitle")}
              </h4>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: "minimal", icon: List },
                { id: "normal", icon: Info },
                { id: "detailed", icon: Shield },
                { id: "dm_private", icon: EyeOff },
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={async () => {
                    const { error } = await supabase
                      .from("combat_encounters")
                      .update({ combat_log_detail_mode: mode.id })
                      .eq("id", encounter.id);
                    if (error) toast.error(error.message);
                  }}
                  className={`p-2 rounded border flex flex-col items-center gap-1 transition-all ${
                    encounter.combat_log_detail_mode === mode.id
                      ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold)] shadow-[0_0_8px_rgba(212,175,55,0.2)]"
                      : "border-border hover:border-[var(--gold)]/40 text-muted-foreground"
                  }`}
                  title={t(`combat.settings.logDetail.${mode.id}` as any)}
                >
                  <mode.icon size={14} />
                  <span className="text-[8px] uppercase font-display tracking-tighter">
                    {t(`combat.settings.logDetail.${mode.id}` as any).split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[9px] text-muted-foreground text-center px-2">
              {t(`combat.settings.logDetailHint.${encounter.combat_log_detail_mode}` as any)}
            </p>
          </div>

          <div className="gem-divider opacity-40" />

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button className="btn-fantasy" style={{ background: "var(--loss)", color: "white" }}
              onClick={() => setConfirmState({
                message: t("combat.confirmCancel"),
                onConfirm: async () => {
                  const r = await cancelInitiative(encounter, dm);
                  if (!r.ok) toast.error(t("combat.cancelError"));

                },
              })}>
              <X size={14} className="inline mr-1" /> {t("combat.cancel")}
            </button>
            <button className="btn-fantasy" disabled={participants.length === 0}
              style={{ background: "var(--gradient-gold)", color: "oklch(0.15 0.03 25)" }}
              onClick={async () => {
                const r = await startCombat(encounter, participants, groups, dm);
                if (!r.ok) toast.error(t("combat.startError"));
              }}>
              <Play size={14} className="inline mr-1" /> {t("combat.start")}
            </button>
          </div>
        </>
      )}

      {status === "active" && encounter && (
        <>
          <div className="ornate-card !p-2 space-y-1.5">
            <p className="text-[10px] font-display uppercase tracking-widest text-[var(--gold)]">{t("combat.round")}</p>
            <CombatList encounter={encounter} participants={participants} groups={groups} pins={pins}
              onReorder={async (key, toIndex) => {
                const r = await reorderBlockWithAutoInitiative(encounter, buildOrderedTurns(participants, groups, pins), key, toIndex);
                if (!r.ok) toast.error(t("combat.reorderError") || "Reorder failed");
              }} />
          </div>
          <div className="ornate-card !p-2 space-y-2">
            {canAddEnemy && (
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-fantasy text-xs"
                  style={{ background: "color-mix(in oklab, var(--loss) 45%, var(--card))", color: "white" }}
                  onClick={() => setAddingEnemy(true)}>
                  <Plus size={12} className="inline mr-1" /> {t("combat.addEnemy")}
                </button>
                <button className="btn-fantasy text-xs"
                  style={{ background: "color-mix(in oklab, var(--gold) 35%, var(--card))", color: "white" }}
                  onClick={() => setPickingTemplate(true)}>
                  <BookOpen size={12} className="inline mr-1" /> {t("bestiary.addFromBestiary")}
                </button>
              </div>
            )}
            <EnemyManagerDM encounter={encounter} participants={participants} groups={groups} pins={pins} dm={dm} />
          </div>
          <button className="btn-fantasy w-full text-xs py-1.5"
            style={{ background: "color-mix(in oklab, var(--gold) 30%, var(--card))", color: "var(--gold)" }}
            onClick={() => setApplyingEffect(true)}>
            <Sparkles size={12} className="inline mr-1" /> {t("combat.dmEffects.openButton")}
          </button>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button className="btn-fantasy text-xs"
              style={{ background: "color-mix(in oklab, var(--gold) 25%, var(--card))", color: "var(--gold)" }}
              onClick={() => setShowManager(true)}>
              <Users size={14} className="inline mr-1" /> {t("combat.combatManager")}
            </button>
            <button className="btn-fantasy text-xs disabled:opacity-60"
              disabled={endingTurn}
              style={{ background: "var(--gradient-gold)", color: "oklch(0.15 0.03 25)" }}
              onClick={() => setConfirmingEndTurn(true)}>
              {endingTurn ? t("combat.endTurn.resolving") : t("combat.nextTurn")} <ChevronRight size={14} className="inline" />
            </button>
            <button className="btn-fantasy text-xs"
              style={{ background: "var(--loss)", color: "white" }}
              onClick={() => setConfirmState({
                message: t("combat.confirmEnd"),
                onConfirm: async () => {
                  const r = await endCombat(encounter, dm);
                  if (!r.ok) toast.error(t("combat.endError"));
                  else if (r.summary) setEndSummary(r.summary);

                },
              })}>
              <X size={14} className="inline mr-1" /> {t("combat.end")}
            </button>
          </div>

        </>
      )}


      {addingEnemy && encounter && (
        <EnemyEditorModal encounter={encounter} dm={dm} onClose={() => setAddingEnemy(false)} />
      )}
      {pickingTemplate && encounter && (
        <BestiaryPickerModal
          campaignId={campaignId}
          encounter={encounter}
          dm={dm}
          onClose={() => setPickingTemplate(false)}
        />
      )}
      {applyingEffect && encounter && (
        <DMApplyEffectModal
          encounter={encounter}
          participants={participants}
          dm={dm}
          onClose={() => setApplyingEffect(false)}
        />
      )}

      {confirmState && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-3" {...backdropProps(() => setConfirmState(null))}>
          <div className="ornate-card max-w-sm w-full p-4 space-y-3" onClick={e => e.stopPropagation()}>
            <p className="text-sm text-foreground">{confirmState.message}</p>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-fantasy text-xs" onClick={() => setConfirmState(null)}>
                {t("common.cancel")}
              </button>
              <button className="btn-fantasy text-xs"
                style={{ background: "var(--loss)", color: "white" }}
                onClick={() => {
                  const fn = confirmState.onConfirm;
                  setConfirmState(null);
                  fn();
                }}>
                {t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showManager && encounter && (
        <CombatManagerModal
          encounter={encounter}
          participants={participants}
          groups={groups}
          pins={pins}
          dm={dm}
          onClose={() => setShowManager(false)}
        />
      )}

      {confirmingEndTurn && encounter && (
        <EndTurnConfirmModal
          encounter={encounter}
          participants={participants}
          groups={groups}
          pins={pins}
          onConfirm={async () => {
            setEndingTurn(true);
            try {
              const r = await endActiveTurn(encounter, buildOrderedTurns(participants, groups, pins), dm);
              if (!r.ok && r.error !== "stale" && r.error !== "busy") {
                toast.error(t("combat.endTurn.error"));
              }
            } finally {
              setEndingTurn(false);
            }
          }}
          onClose={() => setConfirmingEndTurn(false)}
        />
      )}
      
      {endSummary && (
        <CombatSummaryModal 
          summary={endSummary} 
          onClose={() => setEndSummary(null)} 
        />
      )}


    </div>
  );
}

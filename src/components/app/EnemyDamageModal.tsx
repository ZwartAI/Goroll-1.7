import { useState } from "react";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { applyEnemyDamage, healEnemy, type CombatParticipant } from "@/lib/combat";
import { NumberInput } from "@/components/app/NumberInput";

type Props = {
  participant: CombatParticipant;
  onClose: () => void;
  /** Which sections to show. Default "both". */
  mode?: "both" | "heal" | "damage";
};

export function EnemyDamageModal({ participant, onClose, mode = "both" }: Props) {
  const { t } = useT();
  const [damage, setDamage] = useState(0);
  const [heal, setHeal] = useState(0);
  const [useDef, setUseDef] = useState(true);
  const [busy, setBusy] = useState(false);
  const def = participant.enemy_defense || 0;

  const preview = Math.max(0, damage - (useDef ? def : 0));

  const doDamage = async () => {
    if (damage <= 0) return;
    setBusy(true);
    const r = await applyEnemyDamage(participant, damage, { useDefense: useDef });
    setBusy(false);
    if (!r.ok) toast.error(t("combat.saveError"));
    else toast.success(t("combat.damageApplied", { n: r.applied, def: useDef ? def : 0 }));
    onClose();
  };

  const doHeal = async () => {
    if (heal <= 0) return;
    setBusy(true);
    const r = await healEnemy(participant, heal);
    setBusy(false);
    if (!r.ok) toast.error(t("combat.saveError"));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3" onClick={onClose}>
      <div className="ornate-card max-w-sm w-full p-4 space-y-3" onClick={e => e.stopPropagation()}>
        <h3 className="font-display text-[var(--gold)] text-base uppercase tracking-widest">
          {participant.display_name}
        </h3>
        <p className="text-[11px] text-muted-foreground">
          HP {participant.enemy_hp}/{participant.enemy_max_hp} · {t("combat.defense")} {def}
        </p>

        {(mode === "both" || mode === "damage") && (
          <div className="space-y-2">
            <label className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{t("combat.damage")}</label>
            <NumberInput min={0} value={damage} onChange={setDamage} />
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={useDef} onChange={e => setUseDef(e.target.checked)} />
              <span>{t("combat.applyWithDefense")}</span>
            </label>
            <p className="text-[11px] text-muted-foreground">→ {preview} HP</p>
            <button className="btn-fantasy w-full" disabled={busy || damage <= 0}
              style={{ background: "var(--loss)", color: "white" }} onClick={doDamage}>
              {t("combat.applyDamage")}
            </button>
          </div>
        )}

        {(mode === "both" || mode === "heal") && (
          <div className={mode === "both" ? "space-y-2 pt-2 border-t border-border" : "space-y-2"}>
            <label className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{t("combat.heal")}</label>
            <NumberInput min={0} value={heal} onChange={setHeal} />
            <button className="btn-fantasy w-full" disabled={busy || heal <= 0}
              style={{ background: "var(--gain)", color: "white" }} onClick={doHeal}>
              {t("combat.heal")}
            </button>
          </div>
        )}

        <button className="btn-fantasy w-full" onClick={onClose} disabled={busy}>{t("common.cancel")}</button>
      </div>
    </div>
  );
}

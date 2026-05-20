import { useState } from "react";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { applyEnemyDamage, healEnemy, type CombatParticipant } from "@/lib/combat";

type Props = {
  participant: CombatParticipant;
  onClose: () => void;
};

export function EnemyDamageModal({ participant, onClose }: Props) {
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

        <div className="space-y-2">
          <label className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{t("combat.damage")}</label>
          <input type="number" min={0} className="input-fantasy w-full" value={damage}
            onChange={e => setDamage(Math.max(0, parseInt(e.target.value) || 0))} />
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

        <div className="space-y-2 pt-2 border-t border-border">
          <label className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{t("combat.heal")}</label>
          <input type="number" min={0} className="input-fantasy w-full" value={heal}
            onChange={e => setHeal(Math.max(0, parseInt(e.target.value) || 0))} />
          <button className="btn-fantasy w-full" disabled={busy || heal <= 0}
            style={{ background: "var(--gain)", color: "white" }} onClick={doHeal}>
            {t("combat.heal")}
          </button>
        </div>

        <button className="btn-fantasy w-full" onClick={onClose} disabled={busy}>{t("common.cancel")}</button>
      </div>
    </div>
  );
}

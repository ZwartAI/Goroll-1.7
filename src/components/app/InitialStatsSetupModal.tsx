import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { pushLog } from "@/lib/log";
import type { Character } from "@/lib/game";
import { toast } from "sonner";
import { ConfirmDialog } from "./ConfirmDialog";

/**
 * Forced initial stats screen for newly created player characters.
 * Renders only when `stats_setup_completed === false`. The pool of points
 * is distributed across the six attributes (base 10 each). Once accepted,
 * the flag flips and the screen never shows again for that character.
 */
const TOTAL_POOL = 12;
const BASE = 10;
const MAX_PER = 18;
const ATTR_KEYS: { k: "fue"|"des"|"con"|"int_stat"|"wis"|"car"; label: string }[] = [
  { k: "fue", label: "attr.fue" },
  { k: "des", label: "attr.des" },
  { k: "con", label: "attr.con" },
  { k: "int_stat", label: "attr.int" },
  { k: "wis", label: "attr.wis" },
  { k: "car", label: "attr.car" },
];

type Props = {
  character: Character;
  campaignId: string;
  onDone: () => void;
};

export function InitialStatsSetupModal({ character, campaignId, onDone }: Props) {
  const { t } = useT();
  const [values, setValues] = useState<Record<string, number>>({
    fue: BASE, des: BASE, con: BASE, int_stat: BASE, wis: BASE, car: BASE,
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const spent = Object.values(values).reduce((acc, v) => acc + (v - BASE), 0);
  const remaining = TOTAL_POOL - spent;

  function bump(k: string, delta: number) {
    setValues(prev => {
      const cur = prev[k] ?? BASE;
      const next = Math.max(BASE, Math.min(MAX_PER, cur + delta));
      const newSpent = Object.entries(prev).reduce((acc, [kk, vv]) => acc + ((kk === k ? next : vv) - BASE), 0);
      if (newSpent > TOTAL_POOL) return prev;
      return { ...prev, [k]: next };
    });
  }

  async function commit() {
    if (remaining !== 0) {
      toast.error(t("statsSetup.needAllPoints"));
      setConfirmOpen(false);
      return;
    }
    setBusy(true);
    try {
      const update: Record<string, number | boolean> = { ...values, stats_setup_completed: true };
      await supabase.from("characters").update(update as any).eq("id", character.id);
      await pushLog(campaignId, [
        { t: "char", v: character.name, color: character.color, id: character.id },
        { t: "text", v: "— " + t("statsSetup.saved") },
      ]);
      toast.success(t("statsSetup.saved"));
      onDone();
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
      <div className="ornate-card max-w-md w-full p-4 space-y-3 my-6">
        <header className="text-center space-y-1">
          <h2 className="font-display text-lg uppercase tracking-widest text-[var(--gold)]">
            {t("statsSetup.title")}
          </h2>
          <p className="text-xs text-muted-foreground">{t("statsSetup.subtitle")}</p>
        </header>

        <div className="text-center ornate-card p-2">
          <p className="text-[10px] uppercase text-muted-foreground">{t("statsSetup.pointsLeft")}</p>
          <p
            className="font-display text-2xl"
            style={{
              color: remaining === 0 ? "var(--gain)" : remaining < 0 ? "var(--loss)" : "var(--gold)",
            }}
          >
            {remaining}
          </p>
        </div>

        <div className="space-y-1.5">
          {ATTR_KEYS.map(({ k, label }) => {
            const v = values[k] ?? BASE;
            const canDec = v > BASE;
            const canInc = v < MAX_PER && remaining > 0;
            return (
              <div key={k} className="stat-pill !text-xs flex items-center gap-2">
                <span className="flex-1 truncate">{t(label as any)}</span>
                <button
                  className="px-2 rounded bg-secondary border border-border disabled:opacity-30"
                  onClick={() => bump(k, -1)}
                  disabled={!canDec || busy}
                >−</button>
                <span className="w-10 text-center text-[var(--gold)] font-display tabular-nums">{v}</span>
                <button
                  className="px-2 rounded bg-secondary border border-border disabled:opacity-30"
                  onClick={() => bump(k, +1)}
                  disabled={!canInc || busy}
                >+</button>
              </div>
            );
          })}
        </div>

        <button
          className="btn-fantasy w-full"
          style={{
            background: remaining === 0 ? "var(--gradient-gold)" : undefined,
            color: remaining === 0 ? "oklch(0.15 0.03 25)" : undefined,
            opacity: remaining === 0 ? 1 : 0.6,
          }}
          disabled={remaining !== 0 || busy}
          onClick={() => setConfirmOpen(true)}
        >
          {t("statsSetup.confirm")}
        </button>

        <ConfirmDialog
          open={confirmOpen}
          title={t("statsSetup.confirmAgain")}
          description={t("statsSetup.confirmBody")}
          confirmLabel={t("statsSetup.confirm")}
          cancelLabel={t("statsSetup.cancel")}
          busy={busy}
          onConfirm={commit}
          onCancel={() => setConfirmOpen(false)}
        />
      </div>
    </div>
  );
}

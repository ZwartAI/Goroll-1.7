import { useState } from "react";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { logEnemySpeech, type CombatParticipant } from "@/lib/combat";
import { EnemyIcon } from "@/components/app/EnemyIconPicker";

export function EnemySpeechModal({
  participant, onClose,
}: { participant: CombatParticipant; onClose: () => void }) {
  const { t } = useT();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const color = participant.enemy_color || "var(--loss)";

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    const r = await logEnemySpeech(participant, text);
    setBusy(false);
    if (!r.ok) { toast.error(t("combat.saveError")); return; }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3" onClick={onClose}>
      <div className="ornate-card max-w-sm w-full p-4 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center"
            style={{ borderColor: color, color }}>
            <EnemyIcon name={participant.enemy_icon} size={18} />
          </div>
          <div>
            <p className="font-display text-sm" style={{ color }}>{participant.display_name}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {t("combat.enemy.speakAs")}
            </p>
          </div>
        </div>
        <textarea
          value={text} onChange={e => setText(e.target.value)} rows={4} autoFocus
          placeholder="..."
          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-2 text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-fantasy" onClick={onClose} disabled={busy}>{t("common.cancel")}</button>
          <button className="btn-fantasy" disabled={busy || !text.trim()}
            style={{ background: "var(--gradient-gold)", color: "oklch(0.15 0.03 25)" }}
            onClick={submit}>{t("common.confirm")}</button>
        </div>
      </div>
    </div>
  );
}

import { useT } from "@/lib/i18n";
import { backdropProps } from "@/lib/modalBackdrop";
import { Swords, X, Heart, HeartOff } from "lucide-react";

type CombatSummaryEntry = {
  id: string;
  name: string;
  current_hp: number;
  max_hp: number;
  color: string;
  image_url: string | null;
  is_survivor: boolean;
};

type Props = {
  summary: CombatSummaryEntry[];
  onClose: () => void;
};

export function CombatSummaryModal({ summary, onClose }: Props) {
  const { t } = useT();

  const survivors = summary.filter(s => s.is_survivor);
  const defeated = summary.filter(s => !s.is_survivor);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-2 sm:p-4" {...backdropProps(onClose)}>
      <div className="ornate-card w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-2 p-3 border-b border-[var(--gold)]/30">
          <Swords size={16} className="text-[var(--gold)]" />
          <h2 className="font-display text-sm uppercase tracking-widest text-[var(--gold)] flex-1">
            {t("combat.ended.summaryTitle")}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10" aria-label={t("common.close")}>
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Survivors */}
          <section className="space-y-3">
            <h3 className="text-xs font-display uppercase tracking-wider text-[var(--gain)] flex items-center gap-2">
              <Heart size={14} />
              {t("combat.ended.survivors")} ({survivors.length})
            </h3>
            <div className="space-y-2">
              {survivors.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic pl-6">—</p>
              )}
              {survivors.map(s => (
                <SummaryRow key={s.id} entry={s} />
              ))}
            </div>
          </section>

          {/* Defeated */}
          <section className="space-y-3">
            <h3 className="text-xs font-display uppercase tracking-wider text-[var(--loss)] flex items-center gap-2">
              <HeartOff size={14} />
              {t("combat.ended.defeatedGroup")} ({defeated.length})
            </h3>
            <div className="space-y-2">
              {defeated.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic pl-6">{t("combat.ended.noDefeated")}</p>
              ) : (
                defeated.map(s => (
                  <SummaryRow key={s.id} entry={s} />
                ))
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--gold)]/30">
          <button onClick={onClose} className="btn-fantasy w-full py-2">
            {t("common.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ entry }: { entry: CombatSummaryEntry }) {
  const { t } = useT();
  return (
    <div className="flex items-center gap-3 p-2 rounded bg-white/5 border border-white/10">
      <div 
        className="w-10 h-10 rounded-full overflow-hidden border-2 shrink-0 bg-card"
        style={{ borderColor: entry.color }}
      >
        {entry.image_url ? (
          <img src={entry.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            ?
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: entry.color }}>{entry.name}</p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>HP {entry.current_hp}/{entry.max_hp}</span>
          <span>•</span>
          <span style={{ color: entry.is_survivor ? "var(--gain)" : "var(--loss)" }}>
            {entry.is_survivor ? t("combat.ended.survivor") : t("combat.ended.defeated")}
          </span>
        </div>
      </div>
    </div>
  );
}

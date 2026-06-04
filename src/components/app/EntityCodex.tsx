import { useEffect, useState, type ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { MoreHorizontal } from "lucide-react";
import { EnemyIcon, type EnemyCustomImage } from "./EnemyIconPicker";
import { ListRowActionsMenu, type ListRowAction } from "./ListRowActionsMenu";

export type CodexEntry = {
  id: string;
  name: string;
  color: string;
  iconKey: string;
  customImage: EnemyCustomImage | null;
  hasAsset: boolean;
  subline: ReactNode;
  badges?: ReactNode;
  actions: ListRowAction[];
};

/**
 * Hunter's Journal / Pokédex style split view: vertical list of entities on
 * the left, a large framed portrait of the selected entity on the right.
 * Image framing (offset + scale) is respected via <EnemyIcon /> so the
 * preview matches whatever the DM configured in the editor.
 */
export function EntityCodex({
  entries,
  emptyLabel,
}: {
  entries: CodexEntry[];
  emptyLabel: string;
}) {
  const { t } = useT();
  const [selectedId, setSelectedId] = useState<string | null>(entries[0]?.id ?? null);
  const [manageId, setManageId] = useState<string | null>(null);

  useEffect(() => {
    if (entries.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!entries.some((e) => e.id === selectedId)) {
      setSelectedId(entries[0].id);
    }
  }, [entries, selectedId]);

  if (entries.length === 0) {
    return <p className="text-center text-xs text-muted-foreground py-8">{emptyLabel}</p>;
  }

  const selected = entries.find((e) => e.id === selectedId) ?? entries[0];
  const previewHasImg = !!selected.customImage?.url || selected.hasAsset;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[42%_1fr] gap-2">
      {/* Codex list */}
      <div className="flex flex-col gap-1 max-h-[58vh] md:max-h-[72vh] overflow-y-auto pr-1">
        {entries.map((e) => {
          const isSel = e.id === selected.id;
          return (
            <article
              key={e.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(e.id)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  setSelectedId(e.id);
                }
              }}
              className={`ornate-card px-2 py-1.5 flex items-center gap-2 cursor-pointer transition ${
                isSel
                  ? "shadow-[0_0_14px_color-mix(in_oklab,var(--gold)_35%,transparent)]"
                  : "hover:border-[var(--gold)]/40"
              }`}
              style={{
                borderColor: isSel
                  ? "var(--gold)"
                  : `color-mix(in oklab, ${e.color} 55%, transparent)`,
                background: isSel
                  ? "color-mix(in oklab, var(--gold) 8%, transparent)"
                  : undefined,
              }}
            >
              <div
                className="relative w-9 h-9 rounded-full border-2 overflow-hidden flex items-center justify-center bg-card shrink-0"
                style={{ borderColor: e.color, color: e.color }}
              >
                <EnemyIcon
                  name={e.iconKey}
                  size={20}
                  fill={e.hasAsset || !!e.customImage?.url}
                  customImage={e.customImage}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p
                    className="font-display truncate text-sm"
                    style={{ color: e.color }}
                  >
                    {e.name}
                  </p>
                  {e.badges}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{e.subline}</p>
              </div>
              <div
                className="relative shrink-0"
                onClick={(ev) => ev.stopPropagation()}
              >
                <button
                  className="btn-fantasy text-[10px] py-1 px-2 flex items-center gap-1"
                  onClick={() => setManageId(manageId === e.id ? null : e.id)}
                  aria-haspopup="menu"
                  aria-expanded={manageId === e.id}
                >
                  <MoreHorizontal size={11} /> {t("common.manage")}
                </button>
                <ListRowActionsMenu
                  open={manageId === e.id}
                  onClose={() => setManageId(null)}
                  actions={e.actions}
                />
              </div>
            </article>
          );
        })}
      </div>

      {/* Large preview */}
      <div
        className="ornate-card relative overflow-hidden flex flex-col min-h-[300px] md:min-h-[440px] md:sticky md:top-2 self-start"
        style={{
          borderColor: `color-mix(in oklab, ${selected.color} 55%, transparent)`,
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, color-mix(in oklab, ${selected.color} 22%, transparent), transparent 70%)`,
          }}
        />
        <div className="relative flex-1 flex items-center justify-center p-4">
          <div
            className="relative w-full max-w-[320px] aspect-square rounded-xl overflow-hidden border-2 flex items-center justify-center"
            style={{
              borderColor: selected.color,
              background: "color-mix(in oklab, var(--secondary) 80%, black)",
            }}
          >
            <EnemyIcon
              name={selected.iconKey}
              size={140}
              fill={previewHasImg}
              customImage={selected.customImage}
            />
          </div>
        </div>
        <div className="relative px-4 pb-3 text-center">
          <p
            className="font-display text-base md:text-lg truncate"
            style={{ color: selected.color }}
          >
            {selected.name}
          </p>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
            {selected.subline}
          </p>
        </div>
      </div>
    </div>
  );
}

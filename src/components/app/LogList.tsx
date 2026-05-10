import { useState, type ReactNode } from "react";

/**
 * Log container that:
 *  - Shows last `initial` entries (newest order assumed pre-sorted).
 *  - Renders a "ver más +" expander to reveal the rest.
 *  - Wraps the scroll area INSIDE the ornate-card so the inner red
 *    border (::before) doesn't visually scroll out of view.
 */
export function LogList<T>({
  rows,
  initial = 20,
  maxH = "max-h-[60vh]",
  empty = "El log está vacío.",
  renderRow,
}: {
  rows: T[];
  initial?: number;
  maxH?: string;
  empty?: string;
  renderRow: (row: T) => ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, initial);
  const hidden = rows.length - visible.length;

  return (
    <div className="ornate-card p-1">
      <div className={`${maxH} overflow-y-auto p-2 space-y-2`}>
        {visible.map(renderRow)}
        {!rows.length && <p className="text-center text-xs text-muted-foreground py-4">{empty}</p>}
        {hidden > 0 && (
          <button
            className="w-full text-xs text-[var(--gold)] hover:underline py-2"
            onClick={() => setExpanded(true)}
          >
            ver más + ({hidden})
          </button>
        )}
        {expanded && rows.length > initial && (
          <button
            className="w-full text-[10px] text-muted-foreground hover:underline py-1"
            onClick={() => setExpanded(false)}
          >
            ver menos −
          </button>
        )}
      </div>
    </div>
  );
}

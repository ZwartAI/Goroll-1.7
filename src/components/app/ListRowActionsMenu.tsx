import { useEffect, useRef, type ReactNode } from "react";

export type ListRowAction = {
  key: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
};

/**
 * Ultra-lightweight popover menu for list rows. Avoids Radix DropdownMenu
 * overhead (FocusScope, RemoveScroll, multiple Portals) so it stays snappy
 * even on long lists with many rows.
 */
export function ListRowActionsMenu({
  open,
  onClose,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  actions: ListRowAction[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: PointerEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // Defer one tick so the click that opened the menu doesn't close it.
    const id = window.setTimeout(() => {
      document.addEventListener("pointerdown", onDocPointer, true);
    }, 0);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("pointerdown", onDocPointer, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      ref={ref}
      role="menu"
      className="absolute right-0 top-full mt-1 z-50 min-w-[10rem] rounded-md border border-border bg-card shadow-lg p-1"
    >
      {actions.map((a) => (
        <button
          key={a.key}
          role="menuitem"
          onClick={() => {
            onClose();
            a.onSelect();
          }}
          className={`w-full text-left text-xs px-2 py-1.5 rounded flex items-center gap-2 hover:bg-muted/60 ${
            a.danger ? "text-[var(--loss)]" : ""
          }`}
        >
          {a.icon}
          <span className="truncate">{a.label}</span>
        </button>
      ))}
    </div>
  );
}

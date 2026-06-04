import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";


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
  const menuRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; placement: "top" | "bottom" } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const compute = () => {
      const anchor = anchorRef.current?.parentElement;
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const menuH = menuRef.current?.offsetHeight ?? 0;
      const menuW = menuRef.current?.offsetWidth ?? 160;
      const spaceBelow = window.innerHeight - r.bottom;
      const placement: "top" | "bottom" = spaceBelow < menuH + 12 && r.top > menuH + 12 ? "top" : "bottom";
      const top = placement === "bottom" ? r.bottom + 4 : r.top - menuH - 4;
      const left = Math.max(8, Math.min(window.innerWidth - menuW - 8, r.right - menuW));
      setPos({ top, left, placement });
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: PointerEvent) => {
      if (!menuRef.current) return;
      const target = e.target as Node;
      if (menuRef.current.contains(target)) return;
      if (anchorRef.current?.parentElement?.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
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

  if (!open) return <span ref={anchorRef} className="hidden" />;
  return (
    <>
      <span ref={anchorRef} className="hidden" />
      {typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: "fixed", top: pos?.top ?? -9999, left: pos?.left ?? -9999, visibility: pos ? "visible" : "hidden" }}
            className="z-[100] min-w-[10rem] rounded-md border border-border bg-card shadow-lg p-1"
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
          </div>,
          document.body,
        )}
    </>
  );
}


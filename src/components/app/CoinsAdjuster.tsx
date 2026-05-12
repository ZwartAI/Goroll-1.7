import { useState } from "react";

/** Player & DM coin adjuster: 🪙 Recibir / 💸 Pagar buttons that open a modal for an exact amount. */
export function CoinsAdjuster({ onApply }: { onApply: (delta: number) => void | Promise<void> }) {
  const [open, setOpen] = useState<"add" | "sub" | null>(null);
  const [val, setVal] = useState("");
  const n = parseInt(val, 10);
  return (
    <>
      <div className="flex gap-1 justify-center">
        <button
          onClick={() => { setOpen("add"); setVal(""); }}
          className="text-[10px] px-2 py-1 rounded bg-[var(--gold)] text-black font-display"
          title="Recibir monedas"
        >🪙 +</button>
        <button
          onClick={() => { setOpen("sub"); setVal(""); }}
          className="text-[10px] px-2 py-1 rounded font-display text-white"
          style={{ background: "var(--gradient-blood, var(--loss))" }}
          title="Pagar / quitar monedas"
        >💸 −</button>
      </div>
      {open && (
        <div className="fixed inset-0 bg-black/85 z-[80] flex items-center justify-center p-4" onClick={() => setOpen(null)}>
          <div className="ornate-card p-4 max-w-xs w-full space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-center">
              {open === "add" ? "🪙 Recibir monedas" : "💸 Pagar monedas"}
            </h3>
            <input
              autoFocus type="number" min={1} inputMode="numeric"
              value={val} onChange={e => setVal(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Cantidad"
              className="w-full bg-input border border-border rounded px-3 py-2 text-center text-lg"
            />
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-fantasy" onClick={() => setOpen(null)}>Cancelar</button>
              <button
                className="btn-fantasy"
                style={{ background: "var(--gradient-gold)", color: "oklch(0.15 0.03 25)" }}
                disabled={!n || n <= 0}
                onClick={async () => {
                  if (!n || n <= 0) return;
                  await onApply(open === "add" ? n : -n);
                  setOpen(null); setVal("");
                }}
              >OK</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ItemView } from "@/components/app/ItemView";
import type { Item } from "@/lib/game";

/** Read-only view of an item by id (used from log clicks for players). */
export function ItemModal({ itemId, onClose, footer }: { itemId: string; onClose: () => void; footer?: React.ReactNode }) {
  const [item, setItem] = useState<Item | null>(null);
  useEffect(() => {
    supabase.from("items").select("*").eq("id", itemId).maybeSingle().then(({ data }) => setItem(data as Item | null));
  }, [itemId]);
  return (
    <div className="fixed inset-0 bg-black/85 z-[65] flex items-center justify-center p-4" onClick={onClose}>
      <div className="ornate-card p-4 max-w-sm w-full space-y-3" onClick={e => e.stopPropagation()}>
        {item ? <ItemView item={item} /> : <p className="text-muted-foreground text-sm text-center">Objeto no disponible.</p>}
        {footer}
        <button className="btn-fantasy w-full" onClick={onClose}>Regresar</button>
      </div>
    </div>
  );
}
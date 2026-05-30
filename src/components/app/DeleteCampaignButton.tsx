import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { backdropProps } from "@/lib/modalBackdrop";

/**
 * Destructive action: only visible to the campaign owner (NOT co-DMs).
 * Requires typing the confirmation word before confirming.
 * Cascades deletion across all campaign-related tables (no DB FKs in place).
 */
export function DeleteCampaignButton({ campaignId, campaignName, isOwner, onDeleted }: {
  campaignId: string; campaignName: string; isOwner: boolean; onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const { t } = useT();
  if (!isOwner) return null;

  const confirmWord = t("campaign.deleteTypeWord");
  const canConfirm = text.trim().toLowerCase() === confirmWord.toLowerCase() && !busy;

  async function doDelete() {
    if (!canConfirm) return;
    setBusy(true);
    try {
      const { data: chars } = await supabase.from("characters").select("id").eq("campaign_id", campaignId);
      const charIds = (chars || []).map((c: any) => c.id);
      if (charIds.length) {
        await Promise.all([
          (supabase as any).from("character_conditions").delete().in("character_id", charIds),
          (supabase as any).from("character_notes").delete().in("character_id", charIds),
          (supabase as any).from("achievements").delete().in("character_id", charIds),
        ]);
      }
      await Promise.all([
        (supabase as any).from("items").delete().eq("campaign_id", campaignId),
        (supabase as any).from("logs").delete().eq("campaign_id", campaignId),
        (supabase as any).from("boosters").delete().eq("campaign_id", campaignId),
        (supabase as any).from("campaign_members").delete().eq("campaign_id", campaignId),
        (supabase as any).from("dm_join_requests").delete().eq("campaign_id", campaignId),
        (supabase as any).from("achievement_templates").delete().eq("campaign_id", campaignId),
        (supabase as any).from("condition_effects_catalog").delete().eq("campaign_id", campaignId),
      ]);
      await supabase.from("characters").delete().eq("campaign_id", campaignId);
      const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);
      if (error) throw error;
      toast.success(t("campaign.deleted", { name: campaignName }));
      setBusy(false);
      setOpen(false);
      onDeleted?.();
    } catch (e: any) {
      toast.error(e.message || t("campaign.deleteError"));
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className="btn-fantasy w-full text-xs"
        style={{ background: "var(--loss)", color: "white" }}
        onClick={() => { setText(""); setOpen(true); }}
      >{t("campaign.delete")}</button>


      {open && (
        <div className="fixed inset-0 z-[120] bg-black/85 flex items-center justify-center p-4" {...backdropProps(() => !busy && setOpen(false))}>
          <div className="ornate-card p-5 max-w-sm w-full space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg text-center text-[var(--loss)]">{t("campaign.deleteTitle")}</h3>
            <p className="text-sm text-center">
              {t("campaign.deleteConfirm", { name: campaignName })}
            </p>
            <p className="text-xs text-muted-foreground text-center">
              {t("campaign.deleteTypePrompt")}
            </p>
            <input
              autoFocus
              value={text}
              onChange={e => setText(e.target.value)}
              disabled={busy}
              placeholder={confirmWord}
              className="w-full rounded bg-input border border-border px-3 py-2 text-sm text-center font-mono"
            />
            <div className="flex gap-2">
              <button className="btn-fantasy flex-1" disabled={busy} onClick={() => setOpen(false)}>{t("common.cancel")}</button>
              <button
                className="btn-fantasy flex-1 disabled:opacity-40"
                style={{ background: "var(--loss)", color: "white" }}
                disabled={!canConfirm}
                onClick={doDelete}
              >{busy ? t("common.deleting") : t("common.delete")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

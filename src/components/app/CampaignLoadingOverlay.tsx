import { useT } from "@/lib/i18n";

type Props = {
  onCancel: () => void;
};

/**
 * Full-screen blocking overlay shown while a campaign is being loaded /
 * entered. Used both from the home screen (immediately after pressing
 * "Play Campaign") and from CampaignProvider during the initial fetch.
 */
export function CampaignLoadingOverlay({ onCancel }: Props) {
  const { t } = useT();
  return (
    <div className="fixed inset-0 z-[300] bg-black/85 flex items-center justify-center p-4">
      <div className="ornate-card p-5 w-full max-w-sm space-y-4 text-center">
        <div className="flex justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--gold)]/30 border-t-[var(--gold)] animate-spin" />
        </div>
        <div className="space-y-1">
          <h2 className="font-display text-lg text-[var(--gold)]">{t("campaign.loadingTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("campaign.loadingBody")}</p>
        </div>
        <button className="btn-fantasy w-full" onClick={onCancel}>{t("common.cancel")}</button>
      </div>
    </div>
  );
}

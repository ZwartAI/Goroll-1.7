import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CampaignProvider } from "@/lib/CampaignProvider";

export const Route = createFileRoute("/campaign")({
  component: () => (
    <CampaignProvider>
      <Outlet />
    </CampaignProvider>
  ),
});

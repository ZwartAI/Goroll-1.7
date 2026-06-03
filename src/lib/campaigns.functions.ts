import { createServerFn } from "@tanstack/react-start";

export const getMyCampaigns = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string }) => {
    if (!d.userId) throw new Error("Missing user");
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: memberships, error: membershipsError }, { data: owned, error: ownedError }] = await Promise.all([
      supabaseAdmin
        .from("campaign_members")
        .select("campaign_id")
        .eq("user_id", data.userId),
      supabaseAdmin
        .from("campaigns")
        .select("*")
        .eq("owner_user_id", data.userId)
        .order("created_at", { ascending: false }),
    ]);

    if (membershipsError) throw new Error(membershipsError.message);
    if (ownedError) throw new Error(ownedError.message);

    const ownedCampaigns = (owned || []) as any[];
    const ownedIds = new Set(ownedCampaigns.map((campaign) => campaign.id));
    const membershipIds = Array.from(new Set((memberships || []).map((membership) => membership.campaign_id).filter(Boolean)));
    const missingIds = membershipIds.filter((campaignId) => !ownedIds.has(campaignId));

    if (!missingIds.length) {
      return { campaigns: ownedCampaigns };
    }

    const { data: memberCampaigns, error: memberCampaignsError } = await supabaseAdmin
      .from("campaigns")
      .select("*")
      .in("id", missingIds)
      .order("created_at", { ascending: false });

    if (memberCampaignsError) throw new Error(memberCampaignsError.message);

    const campaigns = [...ownedCampaigns, ...((memberCampaigns || []) as any[])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return { campaigns };
  });
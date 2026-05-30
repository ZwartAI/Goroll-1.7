import { supabase } from "@/integrations/supabase/client";

export type RewardSackType = 'normal' | 'special' | 'legendary';

export interface RewardSack {
  id: string;
  campaign_id: string;
  name: string;
  type: RewardSackType;
  has_coins: boolean;
  coins_min: number;
  coins_max: number;
  has_items: boolean;
  has_boosters: boolean;
  has_special_items: boolean;
  random_balanced: boolean;
  manual_item_ids: string[];
  manual_skill_ids: string[];
  manual_booster_ids: string[];
  created_at: string;
  updated_at: string;
}

export const SACK_TYPE_COLORS: Record<RewardSackType, string> = {
  normal: "oklch(0.70 0.08 60)", // Brownish/Wood
  special: "oklch(0.70 0.12 220)", // Blueish/Magic
  legendary: "oklch(0.75 0.15 45)", // Golden
};

export async function fetchRewardSacks(campaignId: string): Promise<RewardSack[]> {
  const { data, error } = await supabase
    .from("reward_sacks")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as RewardSack[];
}

export async function saveRewardSack(sack: Partial<RewardSack> & { campaign_id: string; name: string }) {
  const { data, error } = await supabase
    .from("reward_sacks")
    .upsert(sack as any)
    .select()
    .single();


  if (error) throw error;
  return data as RewardSack;
}

export async function deleteRewardSack(id: string) {
  const { error } = await supabase
    .from("reward_sacks")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function duplicateRewardSack(sack: RewardSack) {
  const { id, created_at, updated_at, ...rest } = sack;
  return saveRewardSack({
    ...rest,
    name: `${rest.name} (Copia)`,
  });
}

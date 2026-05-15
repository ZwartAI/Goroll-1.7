// Re-export from the shared provider so all `/campaign/*` routes share one
// data fetch + realtime subscription instead of refetching on every navigation.
export { useGameData } from "./CampaignProvider";

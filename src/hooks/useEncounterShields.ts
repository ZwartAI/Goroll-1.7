import { useMemo } from "react";
import { useGameData } from "@/lib/CampaignProvider";

/**
 * Uses centralized effects from CampaignProvider and
 * returns aggregated remaining shield values keyed by character id and by
 * enemy participant id.
 */
export function useEncounterShields(encounterId: string | null | undefined) {
  const { combat } = useGameData();

  const { byCharacter, byEnemyParticipant } = useMemo(() => {
    const c: Record<string, number> = {};
    const e: Record<string, number> = {};
    
    if (!encounterId) return { byCharacter: c, byEnemyParticipant: e };

    const shieldEffects = combat.effects.filter(fx => 
      fx.encounter_id === encounterId && 
      fx.effect_type === "shield"
    );

    for (const r of shieldEffects) {
      const v = Math.max(0, r.value || 0);
      if (v <= 0) continue;
      if (r.target_character_id) c[r.target_character_id] = (c[r.target_character_id] || 0) + v;
      if (r.target_enemy_participant_id)
        e[r.target_enemy_participant_id] = (e[r.target_enemy_participant_id] || 0) + v;
    }

    return { byCharacter: c, byEnemyParticipant: e };
  }, [combat.effects, encounterId]);

  return { byCharacter, byEnemyParticipant };
}

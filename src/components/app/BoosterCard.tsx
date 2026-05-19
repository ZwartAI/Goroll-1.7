import { RARITY_COLOR, type Rarity } from "@/lib/game";
import { useT } from "@/lib/i18n";

export type Booster = {
  id: string;
  campaign_id: string;
  name: string;
  rarity: Rarity;
  uses: number;
  max_uses: number;
  owner_character_id: string | null;
  in_dm_vault: boolean;
  created_at: string;
  external_id?: string | null;
  tipo?: string | null;
  modo_lanzamiento?: string | null;
  distancia?: string | null;
  objetivos?: string | null;
  dados?: string | null;
  efecto?: string | null;
  template_id?: string | null;
};

export function BoosterCard({ b, onClick }: { b: Booster; onClick?: () => void }) {
  const color = RARITY_COLOR[b.rarity];
  const { t } = useT();
  return (
    <button
      onClick={onClick}
      className="ornate-card aspect-[3/4] flex flex-col items-center justify-between p-2 relative text-center"
      style={{
        borderColor: color,
        boxShadow: `0 0 10px color-mix(in oklab, ${color} 35%, transparent)`,
        background: `linear-gradient(180deg, color-mix(in oklab, ${color} 18%, var(--card)), var(--card))`,
      }}
    >
      <span className="text-[8px] uppercase tracking-widest" style={{ color }}>{t(`rarities.${b.rarity}`)}</span>
      <span className="text-3xl">🃏</span>
      <span className="text-[10px] font-display leading-tight line-clamp-2 w-full" style={{ color }}>{b.name}</span>
      <span className="text-[9px] text-muted-foreground">{b.uses}/{b.max_uses} {t("boosters.uses").toLowerCase()}</span>
    </button>
  );
}

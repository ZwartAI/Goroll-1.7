import { createFileRoute, Link } from "@tanstack/react-router";
import { useGameData } from "@/lib/useGame";
import { PageFrame } from "@/components/app/Frame";
import { ArrowLeft, Venus, Mars } from "lucide-react";
import { SLOTS, RARITY_COLOR, RARITY_BONUS, isWeapon, type Slot, type Item, type Rarity } from "@/lib/game";
import { pushLog } from "@/lib/log";
import { equipItem, unequipItem, getSlotKind } from "@/lib/inventory";
import { RarityBadge } from "@/components/app/RarityBadge";
import { ItemView } from "@/components/app/ItemView";
import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n";
import { backdropProps } from "@/lib/modalBackdrop";
import plantillaHombreAsset from "@/assets/equipment/plantilla-hombre.png.asset.json";
import plantillaMujerAsset from "@/assets/equipment/plantilla-mujer.png.asset.json";

export const Route = createFileRoute("/campaign/equipment")({ component: Equipment });

const EQUIPMENT_LAYOUT_DEBUG = false;

// Template natural size: 941 x 1672. Frame boxes measured from the asset.
// Frame interior dims as % of the template image.
const FRAME_W = 21;
const FRAME_H = 12;
type Pos = { left: number; top: number };
// Positions are TOP-LEFT of the slot box, as % of the template image.
// Each slot is centered inside its golden frame interior.
const SLOT_POS: Record<Slot, Pos> = {
  // Center column (head → chest → belt → legs → feet)
  casco:           { left: 40.83, top: 14.10 },
  pecho:           { left: 40.83, top: 34.37 },
  cinturon:        { left: 40.83, top: 50.82 },
  pantalon:        { left: 40.83, top: 66.91 },
  botas:           { left: 40.83, top: 81.74 },
  // Right column (2 weapon frames)
  arma_principal:  { left: 71.75, top: 45.08 },
  arma_secundaria: { left: 71.75, top: 69.00 },
  // Left column (5 frames top → bottom)
  accesorio1:      { left: 9.27,  top: 8.89  },
  accesorio2:      { left: 9.27,  top: 27.37 },
  guantes:         { left: 9.27,  top: 44.30 },
  mochila:         { left: 9.27,  top: 61.64 },
  aditamento:      { left: 9.27,  top: 78.45 },
};

const TEMPLATE_KEY_PREFIX = "equipTemplate:";

function Equipment() {
  const { character, items, campaign, loading } = useGameData();
  const [picker, setPicker] = useState<Slot | null>(null);
  const { t } = useT();

  const [template, setTemplate] = useState<"male" | "female">("male");
  useEffect(() => {
    if (!character) return;
    const saved = typeof window !== "undefined" ? localStorage.getItem(TEMPLATE_KEY_PREFIX + character.id) : null;
    if (saved === "male" || saved === "female") {
      setTemplate(saved);
    } else {
      // Try infer from character gender field if present
      const g = (character as any).gender || (character as any).sex;
      if (typeof g === "string" && /fem|muj|female/i.test(g)) setTemplate("female");
      else setTemplate("male");
    }
  }, [character?.id]);

  function toggleTemplate() {
    setTemplate(prev => {
      const next = prev === "male" ? "female" : "male";
      if (character && typeof window !== "undefined") {
        localStorage.setItem(TEMPLATE_KEY_PREFIX + character.id, next);
      }
      return next;
    });
  }

  if (loading || !character || !campaign) return <PageFrame><p className="text-center text-muted-foreground">{t("common.loading")}</p></PageFrame>;

  const owned = items.filter(i => i.owner_character_id === character.id && (i.category === "equipo" || !i.category));
  const equipped = (slot: Slot) => owned.find(i => i.equipped && i.slot === slot);

  async function unequip(item: Item) {
    const kind = await unequipItem(item, character!, owned);
    const segs: any[] = [
      { t: "char", v: character!.name, color: character!.color, id: character!.id },
      { t: "text", v: t("inventory.logUnequipped") },
      { t: "item", v: item.name, rarity: item.rarity as any, id: item.id },
    ];
    if (kind === "temporary") segs.push({ t: "text", v: t("inventory.logToTemp") });
    await pushLog(campaign!.id, segs, { kind: "item.update", id: item.id, prev: { equipped: true } });
  }

  async function equipFrom(_slot: Slot, item: Item) {
    await equipItem(item, character!, owned);
    await pushLog(campaign!.id, [
      { t: "char", v: character!.name, color: character!.color, id: character!.id },
      { t: "text", v: t("inventory.logEquipped") },
      { t: "item", v: item.name, rarity: item.rarity as any, id: item.id },
    ], { kind: "item.update", id: item.id, prev: { equipped: false } });
    setPicker(null);
  }

  const bgUrl = template === "female" ? plantillaMujerAsset.url : plantillaHombreAsset.url;
  const toggleLabel = t("equipment.toggleTemplate");

  return (
    <PageFrame title={t("equipment.title")} subtitle={character.name} right={<Link to="/campaign/profile" className="text-muted-foreground"><ArrowLeft size={20}/></Link>}>
      <div className="w-full flex justify-center overflow-x-auto">
        <div
          className="equipment-paper-layout relative mx-auto"
          style={{
            width: "min(100%, 440px)",
            aspectRatio: `${941} / ${1672}`,
            backgroundImage: `url(${bgUrl})`,
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center top",
          }}
        >
          <button
            type="button"
            onClick={toggleTemplate}
            aria-label={toggleLabel}
            title={toggleLabel}
            className="absolute z-20 top-2 right-2 w-9 h-9 rounded-full border border-[var(--gold)]/70 bg-black/60 backdrop-blur-sm flex items-center justify-center text-[var(--gold)] hover:bg-black/80 hover:shadow-[0_0_10px_rgba(234,179,8,0.5)] active:scale-95 transition"
          >
            {template === "male" ? <Mars size={16} /> : <Venus size={16} />}
          </button>

          {SLOTS.map(s => {
            const pos = SLOT_POS[s.key];
            const it = equipped(s.key);
            const label = t(`slots.${s.key}`);
            return (
              <button
                key={s.key}
                onClick={() => setPicker(s.key)}
                aria-label={label}
                title={it ? `${it.name} — ${label}` : label}
                className="absolute group flex flex-col items-center justify-center p-0.5 transition hover:bg-[var(--gold)]/10 overflow-hidden"
                style={{
                  left: `${pos.left}%`,
                  top: `${pos.top}%`,
                  width: `${FRAME_W}%`,
                  height: `${FRAME_H}%`,
                  background: "transparent",
                  border: EQUIPMENT_LAYOUT_DEBUG ? "1px solid red" : "1px solid transparent",
                  borderRadius: 6,
                  boxShadow: it
                    ? `0 0 12px color-mix(in srgb, ${RARITY_COLOR[it.rarity as Rarity]} 50%, transparent), inset 0 0 10px color-mix(in srgb, ${RARITY_COLOR[it.rarity as Rarity]} 30%, transparent)`
                    : undefined,
                }}
              >
                {it ? (() => {
                  const rColor = RARITY_COLOR[it.rarity as Rarity];
                  const weapon = isWeapon(it.slot as any);
                  const def = it.defense_bonus || RARITY_BONUS[it.rarity as Rarity].def;
                  const hp = it.hp_bonus || RARITY_BONUS[it.rarity as Rarity].hp;
                  const dmg = it.damage_bonus;
                  return (
                    <div className="flex flex-col items-center justify-center w-full h-full gap-[1px] px-0.5 leading-none">
                      <span
                        className="leading-none"
                        style={{
                          fontSize: "clamp(10px, 1.8vw, 16px)",
                          filter: `drop-shadow(0 0 3px ${rColor})`,
                          textShadow: "0 1px 2px rgba(0,0,0,0.9)",
                        }}
                      >
                        {s.icon}
                      </span>
                      <span
                        className="font-display font-semibold text-center w-full"
                        style={{
                          color: rColor,
                          fontSize: "clamp(7px, 1.15vw, 10px)",
                          lineHeight: 1.05,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          wordBreak: "break-word",
                          textShadow: "0 1px 2px rgba(0,0,0,0.95)",
                        }}
                      >
                        {it.name}
                      </span>
                      {weapon ? (
                        <span
                          className="font-bold tabular-nums leading-none truncate max-w-full"
                          style={{
                            color: "#fbbf24",
                            fontSize: "clamp(7px, 1.1vw, 10px)",
                            textShadow: "0 1px 2px rgba(0,0,0,0.95)",
                          }}
                        >
                          +{dmg} DMG
                        </span>
                      ) : (
                        <span
                          className="font-bold tabular-nums leading-none truncate max-w-full"
                          style={{
                            fontSize: "clamp(7px, 1.05vw, 10px)",
                            textShadow: "0 1px 2px rgba(0,0,0,0.95)",
                          }}
                        >
                          <span style={{ color: "#60a5fa" }}>+{def}</span>
                          <span className="text-white/50 mx-0.5">·</span>
                          <span style={{ color: "#4ade80" }}>+{hp}</span>
                        </span>
                      )}
                    </div>
                  );
                })() : (
                  <>
                    <span className="text-base leading-none opacity-40 grayscale group-hover:opacity-80 transition pointer-events-none">
                      {s.icon}
                    </span>
                    <span className="text-[8px] leading-tight font-semibold uppercase tracking-wider text-muted-foreground/70 group-hover:text-[var(--gold)]/80 text-center px-0.5 truncate max-w-full pointer-events-none mt-0.5">
                      {label}
                    </span>
                  </>
                )}
                {EQUIPMENT_LAYOUT_DEBUG && (
                  <span className="absolute -bottom-3 left-0 text-[8px] text-red-400 whitespace-nowrap">{s.key}</span>
                )}
              </button>
            );

          })}
        </div>
      </div>

      {picker && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center" {...backdropProps(() => setPicker(null))}>
          <div className="ornate-card p-4 w-full max-w-md max-h-[70vh] overflow-y-auto rounded-b-none" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg mb-3 text-center">{t(`slots.${picker}`)}</h3>
            {equipped(picker) && (
              <div className="mb-3 space-y-3">
                <div className="ornate-card !p-3" style={{ borderColor: RARITY_COLOR[equipped(picker)!.rarity as Rarity] }}>
                  <ItemView item={equipped(picker)!} />
                </div>
                <button className="btn-fantasy w-full" onClick={() => { unequip(equipped(picker)!); setPicker(null); }}>{t("equipment.unequipCurrent")}</button>
              </div>
            )}
            <p className="text-xs uppercase text-muted-foreground tracking-widest mb-2">{t("equipment.backpack")}</p>
            <div className="space-y-2">
              {owned.filter(i => i.slot === picker && !i.equipped).map(i => {
                const temp = getSlotKind(i) === "temporary";
                return (
                  <button key={i.id} className="w-full ornate-card p-3 flex justify-between items-center text-left"
                    onClick={() => equipFrom(picker, i)}
                    style={{
                      borderColor: RARITY_COLOR[i.rarity as Rarity],
                      borderStyle: temp ? "dashed" : undefined,
                    }}>
                    <div>
                      <p className="font-display flex items-center gap-2" style={{ color: RARITY_COLOR[i.rarity as Rarity] }}>
                        {i.name}
                        {temp && <span className="text-[9px] bg-[var(--gold)] text-black px-1 rounded uppercase">{t("inventory.tempTag")}</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {isWeapon(i.slot as any)
                          ? t("equipment.damagePlus", { n: i.damage_bonus })
                          : t("equipment.defHpPlus", { def: i.defense_bonus || RARITY_BONUS[i.rarity as Rarity].def, hp: i.hp_bonus || RARITY_BONUS[i.rarity as Rarity].hp })}
                      </p>
                    </div>
                    <RarityBadge rarity={i.rarity as Rarity} />
                  </button>
                );
              })}
              {!owned.filter(i => i.slot === picker && !i.equipped).length && (
                <p className="text-center text-xs text-muted-foreground py-6">{t("equipment.noItemsForSlot")}</p>
              )}
            </div>
            <button className="btn-fantasy w-full mt-4" onClick={() => setPicker(null)}>{t("common.close")}</button>
          </div>
        </div>
      )}
    </PageFrame>
  );
}

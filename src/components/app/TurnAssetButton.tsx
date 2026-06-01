import React, { useState } from "react";
import { useT } from "@/lib/i18n";
import { playSfx } from "@/lib/sound";
import sfxBtn from "@/assets/sounds/Monedero.mp3";
import { cn } from "@/lib/utils";

const ASSETS_PATH = "/uploads/";

export type TurnButtonState = "requestInitiative" | "initiative" | "waitingTurn" | "endTurn" | "joinLate" | "inLink" | "waitingDm";

interface Props {
  state: TurnButtonState;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

const ASSET_MAP: Record<TurnButtonState, { es: string; en: string; fallbackEs: string; fallbackEn: string }> = {
  requestInitiative: {
    es: "iniciativa.png",
    en: "iniciativa-eng.png",
    fallbackEs: "Pedir iniciativa",
    fallbackEn: "Request initiative",
  },
  initiative: {
    es: "iniciativa.png",
    en: "iniciativa-eng.png",
    fallbackEs: "Iniciativa",
    fallbackEn: "Initiative",
  },
  waitingTurn: {
    es: "esperando-turno.png",
    en: "esperando-turno-eng.png",
    fallbackEs: "Esperando turno",
    fallbackEn: "Awaiting turn",
  },
  endTurn: {
    es: "terminar-turno.png",
    en: "terminar-turno-eng.png",
    fallbackEs: "Terminar turno",
    fallbackEn: "End turn",
  },
  joinLate: {
    es: "iniciativa.png",
    en: "iniciativa-eng.png",
    fallbackEs: "Unirse",
    fallbackEn: "Join late",
  },
  inLink: {
    es: "esperando-turno.png",
    en: "esperando-turno-eng.png",
    fallbackEs: "En Enlace",
    fallbackEn: "In Link",
  },
  waitingDm: {
    es: "esperando-turno.png",
    en: "esperando-turno-eng.png",
    fallbackEs: "Esperando DM",
    fallbackEn: "Waiting for DM",
  },
};

export function TurnAssetButton({ state, onClick, disabled, className, ariaLabel }: Props) {
  const { lang } = useT();
  const [assetError, setAssetError] = useState(false);
  
  const isEn = lang === "en";
  const config = ASSET_MAP[state];
  const assetName = isEn ? config.en : config.es;
  const assetUrl = `${ASSETS_PATH}${assetName}`;
  const label = isEn ? config.fallbackEn : config.fallbackEs;

  const handleAction = () => {
    if (disabled) return;
    if (onClick) {
      onClick();
    } else {
      playSfx(sfxBtn);
    }
  };

  const finalAriaLabel = ariaLabel || label;

  // We use relative positioning for the container and ensure the button has a defined size or fills its parent.
  // The user reported floating letters, so we ensure everything is contained.
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleAction}
      aria-label={finalAriaLabel}
      className={cn(
        "relative w-full block p-0 bg-transparent border-0 select-none transition-all active:scale-[0.96] disabled:opacity-70 disabled:grayscale-[0.3]",
        !disabled && "cursor-pointer",
        className
      )}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div className="relative w-full flex items-center justify-center overflow-visible">
        {!assetError ? (
          <img
            src={assetUrl}
            alt=""
            className="block w-full h-auto pointer-events-none object-contain"
            draggable={false}
            onError={() => setAssetError(true)}
            style={{ marginTop: "-8%", marginBottom: "-8%" }}
          />
        ) : (
          /* FALLBACK BUTTON - RPG STYLE */
          <div 
            className={cn(
              "w-full py-2.5 px-4 rounded-lg border-2 flex items-center justify-center font-display text-[11px] uppercase tracking-[0.15em] text-white shadow-lg transition-colors",
              state === "endTurn" || state === "requestInitiative" || state === "initiative" || state === "joinLate"
                ? "bg-linear-to-b from-[var(--blood)] to-black border-[var(--gold)]/40 hover:border-[var(--gold)]/70"
                : "bg-linear-to-b from-neutral-800 to-black border-neutral-600/40"
            )}
          >
            <span className="drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)] text-center leading-tight">
              {label}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

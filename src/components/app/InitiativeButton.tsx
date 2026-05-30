import { useState } from "react";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import type { Character } from "@/lib/game";
import {
  activeBlock,
  blockContainsCharacter,
  buildOrderedTurns,
  participantForCharacter,
  passTurn,
  type CombatEncounter,
  type CombatParticipant,
  type CombatTurnGroup,
  type CombatTurnPin,
} from "@/lib/combat";
import { InitiativeRollModal } from "@/components/app/InitiativeRollModal";
import { playSfx } from "@/lib/sound";
import sfxBtn from "@/assets/sounds/Monedero.mp3"; // Reusing button sound

const esperandoTurnoEs = "/uploads/esperando-turno.png";
const terminarTurnoEs = "/uploads/terminar-turno.png";
const iniciativaEs = "/uploads/iniciativa.png";
const esperandoTurnoEn = "/uploads/esperando-turno-eng.png";
const terminarTurnoEn = "/uploads/terminar-turno-eng.png";
const iniciativaEn = "/uploads/iniciativa-eng.png";

type Props = {
  character: Character;
  encounter: CombatEncounter | null;
  participants: CombatParticipant[];
  groups: CombatTurnGroup[];
  pins?: CombatTurnPin[];
  /** Online characters in the campaign — used to populate Enlace selector. */
  online: Character[];
};

export function InitiativeButton({ character, encounter, participants, groups, pins, online }: Props) {
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const status = encounter?.status ?? null;
  const myPart = participantForCharacter(participants, character.id);
  const blocks = buildOrderedTurns(participants, groups, pins || []);
  const active = activeBlock(encounter, blocks);
  const myTurn = active ? blockContainsCharacter(active, character.id) : false;

  const isEn = lang === "en";

  const assets = {
    waiting: isEn ? esperandoTurnoEn : esperandoTurnoEs,
    end: isEn ? terminarTurnoEn : terminarTurnoEs,
    initiative: isEn ? iniciativaEn : iniciativaEs,
  };

  const inLink = !!myPart?.turn_group_id;

  let label = t("combat.playerSkill.initiative");
  let onClick: (() => void) | null = null;
  let asset = assets.initiative;
  let disabled = true;
  let ariaLabel = t("combat.playerSkill.initiative");

  if (status === "collecting") {
    if (myPart) {
      label = inLink ? t("combat.btnInLink") : t("combat.btnWaitingDm");
      asset = assets.waiting;
      disabled = true;
      ariaLabel = label;
    } else {
      label = t("combat.playerSkill.initiative");
      onClick = () => setOpen(true);
      disabled = false;
      asset = assets.initiative;
      ariaLabel = label;
    }
  } else if (status === "active") {
    if (myTurn) {
      label = t("combat.playerSkill.endTurn");
      disabled = false;
      asset = assets.end;
      ariaLabel = label;
      onClick = async () => {
        playSfx(sfxBtn);
        const r = await passTurn(encounter!, blocks, character);
        if (!r.ok) toast.error(t("combat.passError"));
      };
    } else if (myPart) {
      label = t("combat.playerSkill.waitingTurn");
      disabled = true;
      asset = assets.waiting;
      ariaLabel = label;
    } else {
      // Combat is active but this character is not registered — allow late join.
      label = t("combat.btnJoinLate");
      onClick = () => setOpen(true);
      disabled = false;
      asset = assets.initiative;
      ariaLabel = label;
    }
  }

  // Exclude self, non-players, and characters already in a link in this encounter.
  const linkedIds = new Set(
    participants.filter(p => p.turn_group_id && p.character_id).map(p => p.character_id as string),
  );
  const linkCandidates = online.filter(
    c => c.id !== character.id && c.role === "player" && !linkedIds.has(c.id),
  );

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            if (onClick) onClick();
            else playSfx(sfxBtn);
          }
        }}
        aria-label={ariaLabel}
        className="relative w-full block p-0 bg-transparent border-0 select-none transition-all active:scale-[0.96] disabled:opacity-70 disabled:grayscale-[0.3]"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <img
          src={asset}
          alt=""
          className="block w-full h-auto pointer-events-none"
          draggable={false}
          style={{ marginTop: "-2%", marginBottom: "-2%" }}
        />

      </button>

      {open && encounter && (
        <InitiativeRollModal
          encounter={encounter}
          character={character}
          linkCandidates={linkCandidates}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

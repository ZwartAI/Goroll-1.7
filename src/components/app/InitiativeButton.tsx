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
import sfxBtn from "@/assets/sounds/Monedero.mp3";
import { TurnAssetButton, type TurnButtonState } from "./TurnAssetButton";

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
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const status = encounter?.status ?? null;
  const myPart = participantForCharacter(participants, character.id);
  const blocks = buildOrderedTurns(participants, groups, pins || []);
  const active = activeBlock(encounter, blocks);
  const myTurn = active ? blockContainsCharacter(active, character.id) : false;

  const inLink = !!myPart?.turn_group_id;

  let btnState: TurnButtonState = "initiative";
  let onClick: (() => void) | null = null;
  let disabled = true;
  let ariaLabel: string | undefined = undefined;

  if (status === "collecting") {
    if (myPart) {
      btnState = inLink ? "inLink" : "waitingDm";
      disabled = true;
    } else {
      btnState = "initiative";
      onClick = () => setOpen(true);
      disabled = false;
    }
  } else if (status === "active") {
    if (myTurn) {
      btnState = "endTurn";
      disabled = false;
      onClick = async () => {
        playSfx(sfxBtn);
        const r = await passTurn(encounter!, blocks, character);
        if (!r.ok) toast.error(t("combat.passError"));
      };
    } else if (myPart) {
      btnState = "waitingTurn";
      disabled = true;
    } else {
      // Combat is active but this character is not registered — allow late join.
      btnState = "joinLate";
      onClick = () => setOpen(true);
      disabled = false;
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
      <TurnAssetButton
        state={btnState}
        disabled={disabled}
        onClick={onClick || undefined}
        ariaLabel={ariaLabel}
      />

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


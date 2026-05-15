import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useGameData } from "@/lib/useGame";
import { PageFrame } from "@/components/app/Frame";
import { NotesEditor } from "@/components/app/NotesEditor";

export const Route = createFileRoute("/campaign/notes")({ component: Notes });

function Notes() {
  const { character, campaign, loading } = useGameData();
  const nav = useNavigate();
  if (loading || !character || !campaign)
    return <PageFrame><p className="text-center text-muted-foreground">Cargando...</p></PageFrame>;
  return (
    <NotesEditor
      characterId={character.id}
      characterName={character.name}
      characterColor={character.color}
      onClose={() => nav({ to: "/campaign/profile" })}
    />
  );
}

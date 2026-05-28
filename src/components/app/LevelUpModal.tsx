import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useT } from "@/lib/i18n";
import { Sparkles, X } from "lucide-react";
import sfxVictory from "@/assets/sounds/Victory.mp3";
import { playSfx, preloadSfx } from "@/lib/sound";
import { backdropProps } from "@/lib/modalBackdrop";

// Warm the buffer as soon as this module loads so the SFX is essentially
// instant the first time a player levels up.
preloadSfx([sfxVictory]);

/**
 * Watches a character's level. When it goes UP (and only for the player viewing
 * their own sheet), shows a celebratory modal with confetti.
 *
 * Pass `enabled={false}` for DM / spectator views — they should not see the
 * player's level-up celebration.
 */
export function LevelUpModal({
  level,
  enabled = true,
  characterId,
}: {
  level: number | null | undefined;
  enabled?: boolean;
  characterId?: string | null;
}) {


  const { t } = useT();
  const lastLevelRef = useRef<number | null>(null);
  const characterIdRef = useRef<string | null>(null);
  const [shownLevel, setShownLevel] = useState<number | null>(null);

  // Sync baseline on first mount or character change
  useEffect(() => {
    if (!enabled || !characterId || typeof level !== "number") return;

    if (characterId !== characterIdRef.current) {
      characterIdRef.current = characterId;
      lastLevelRef.current = level;
      return;
    }

    if (lastLevelRef.current === null) {
      lastLevelRef.current = level;
      return;
    }

    if (level > lastLevelRef.current) {
      // Protection against duplicate modals in the same session
      const seenKey = `level-up-seen-${characterId}-${level}`;
      if (sessionStorage.getItem(seenKey)) {
        lastLevelRef.current = level;
        return;
      }

      lastLevelRef.current = level;
      sessionStorage.setItem(seenKey, "1");
      setShownLevel(level);

      // One-shot victory SFX
      try { playSfx(sfxVictory); } catch { /* ignore */ }

      // Fire confetti
      requestAnimationFrame(() => {
        try {
          confetti({
            particleCount: 140,
            spread: 90,
            startVelocity: 45,
            origin: { y: 0.4 },
            colors: ["#f5c66b", "#b58a37", "#fff2c2", "#a78bfa", "#ffffff"],
            zIndex: 500, // Higher than modal
          });
          setTimeout(() => {
            confetti({
              particleCount: 80,
              spread: 110,
              startVelocity: 35,
              origin: { y: 0.5 },
              colors: ["#f5c66b", "#fff2c2"],
              zIndex: 500,
            });
          }, 260);
        } catch { /* ignore */ }
      });
    } else if (level < lastLevelRef.current) {
      // Sync down silently if level was reduced
      lastLevelRef.current = level;
    }
  }, [level, enabled, characterId]);

  if (shownLevel == null) return null;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      {...backdropProps(() => setShownLevel(null))}
    >
      <div
        className="ornate-card relative w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95 duration-300"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.18 0.04 60), oklch(0.12 0.03 280))",
          borderColor: "var(--gold)",
          boxShadow:
            "0 0 0 1px var(--gold), 0 20px 60px -10px color-mix(in oklab, var(--gold) 40%, transparent)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 p-1 rounded text-muted-foreground hover:text-foreground"
          onClick={() => setShownLevel(null)}
          aria-label="Close"
        >
          <X size={16} />
        </button>
        <div className="flex justify-center mb-3">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: "var(--gradient-gold)",
              boxShadow:
                "0 0 30px color-mix(in oklab, var(--gold) 60%, transparent)",
            }}
          >
            <Sparkles size={32} color="oklch(0.15 0.03 25)" />
          </div>
        </div>
        <h2
          className="font-display text-2xl uppercase tracking-widest mb-2"
          style={{
            background: "var(--gradient-gold)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {t("levelUp.title")}
        </h2>
        <p className="text-sm text-foreground/90 mb-5">
          {t("levelUp.body", { level: String(shownLevel) })}
        </p>
        <button
          className="btn-fantasy w-full"
          style={{
            background: "var(--gradient-gold)",
            color: "oklch(0.15 0.03 25)",
          }}
          onClick={() => setShownLevel(null)}
        >
          {t("levelUp.ok")}
        </button>
      </div>
    </div>
  );
}

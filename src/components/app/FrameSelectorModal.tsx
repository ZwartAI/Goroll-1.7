import { useT } from "@/lib/i18n";
import { X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import portraitFrameDefault from "@/assets/character-sheet/portrait-frame-default.png";
import frame2 from "@/assets/character-sheet/frames/frame-2.png";
import frame3 from "@/assets/character-sheet/frames/frame-3.png";
import frame4 from "@/assets/character-sheet/frames/frame-4.png";
import frame5 from "@/assets/character-sheet/frames/frame-5.png";
import frame6 from "@/assets/character-sheet/frames/frame-6.png";
import frame7 from "@/assets/character-sheet/frames/frame-7.png";
import frame8 from "@/assets/character-sheet/frames/frame-8.png";
import frame9 from "@/assets/character-sheet/frames/frame-9.png";
import frame10 from "@/assets/character-sheet/frames/frame-10.png";
import frame11 from "@/assets/character-sheet/frames/frame-11.png";
import frame12 from "@/assets/character-sheet/frames/frame-12.png";
import frame13 from "@/assets/character-sheet/frames/frame-13.png";
import frame14 from "@/assets/character-sheet/frames/frame-14.png";
import frame15 from "@/assets/character-sheet/frames/frame-15.png";
import frame16 from "@/assets/character-sheet/frames/frame-16.png";
import frame17 from "@/assets/character-sheet/frames/frame-17.png";
import frame18 from "@/assets/character-sheet/frames/frame-18.png";
import frame19 from "@/assets/character-sheet/frames/frame-19.png";
import frame20 from "@/assets/character-sheet/frames/frame-20.png";
import frame21 from "@/assets/character-sheet/frames/frame-21.png";
import { backdropProps } from "@/lib/modalBackdrop";

const FRAMES: { id: string; url: string | null; label: string }[] = [
  { id: "default", url: null, label: "frameDefault" },
  { id: "frame-2", url: frame2, label: "" },
  { id: "frame-3", url: frame3, label: "" },
  { id: "frame-4", url: frame4, label: "" },
  { id: "frame-5", url: frame5, label: "" },
  { id: "frame-6", url: frame6, label: "" },
  { id: "frame-7", url: frame7, label: "" },
  { id: "frame-8", url: frame8, label: "" },
  { id: "frame-9", url: frame9, label: "" },
  { id: "frame-10", url: frame10, label: "" },
  { id: "frame-11", url: frame11, label: "" },
  { id: "frame-12", url: frame12, label: "" },
  { id: "frame-13", url: frame13, label: "" },
  { id: "frame-14", url: frame14, label: "" },
  { id: "frame-15", url: frame15, label: "" },
  { id: "frame-16", url: frame16, label: "" },
  { id: "frame-17", url: frame17, label: "" },
  { id: "frame-18", url: frame18, label: "" },
  { id: "frame-19", url: frame19, label: "" },
  { id: "frame-20", url: frame20, label: "" },
  { id: "frame-21", url: frame21, label: "" },
];

export function FrameSelectorModal({
  characterId,
  currentUrl,
  onClose,
}: {
  characterId: string;
  currentUrl: string | null | undefined;
  onClose: () => void;
}) {
  const { t } = useT();

  async function pick(url: string | null) {
    const { error } = await supabase
      .from("characters")
      .update({ portrait_frame_url: url ?? "" } as any)
      .eq("id", characterId);
    if (error) {
      toast.error(error.message);
      return;
    }
    onClose();
  }

  const normalizedCurrent = currentUrl || null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-3"
      {...backdropProps(onClose)}
    >
      <div
        className="ornate-card p-4 max-w-md w-full max-h-[90vh] overflow-y-auto space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg text-[var(--gold)]">{t("profile.frameSelectTitle")}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {FRAMES.map((f) => {
            const isSel = (f.url || null) === normalizedCurrent;
            const preview = f.url || portraitFrameDefault;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => pick(f.url)}
                className="relative aspect-square rounded-md overflow-hidden bg-[var(--secondary)] border-2 transition-transform active:scale-[0.97]"
                style={{
                  borderColor: isSel ? "var(--gold)" : "var(--border)",
                  boxShadow: isSel
                    ? "0 0 14px color-mix(in oklab, var(--gold) 45%, transparent)"
                    : undefined,
                }}
              >
                <img
                  src={preview}
                  alt={f.label ? t(`profile.${f.label}`) : f.id}
                  className="absolute inset-0 w-full h-full object-contain p-1 pointer-events-none"
                  draggable={false}
                />
                {isSel && (
                  <span className="absolute top-1 right-1 bg-[var(--gold)] rounded-full p-0.5 text-black">
                    <Check size={12} />
                  </span>
                )}
                {f.label && (
                  <span className="absolute bottom-1 left-1 right-1 text-[9px] text-center text-muted-foreground bg-black/60 rounded px-1">
                    {t(`profile.${f.label}`)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

/** Top-right floating fullscreen toggle + global gestures (no-pull-to-refresh, back-block on home). */
export function AppShell() {
  const [fs, setFs] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.overscrollBehaviorY = "contain";
    document.body.style.overscrollBehaviorY = "contain";
    (document.body.style as any).overscrollBehaviorX = "contain";

    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);

    // Block browser-back from leaving the SPA when at the home screen.
    const onPop = () => {
      if (window.location.pathname === "/") {
        window.history.pushState(null, "", window.location.href);
      }
    };
    try { window.history.pushState(null, "", window.location.href); } catch {}
    window.addEventListener("popstate", onPop);

    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  const toggle = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
      else await document.exitFullscreen?.();
    } catch {}
  };

  return (
    <button
      onClick={toggle}
      aria-label={fs ? "Salir de pantalla completa" : "Pantalla completa"}
      className="fixed top-1.5 right-1.5 z-[200] rounded-md border border-border bg-card/60 backdrop-blur p-1.5 text-muted-foreground hover:text-[var(--gold)] hover:border-[var(--gold)] transition-colors"
      style={{ pointerEvents: "auto" }}
    >
      {fs ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
    </button>
  );
}

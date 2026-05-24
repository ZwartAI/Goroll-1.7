import { useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { useLocation } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";

/** Reusable inline fullscreen toggle. Renders nothing on the server. */
export function FullscreenButton({ className = "" }: { className?: string }) {
  const [fs, setFs] = useState(false);
  const { t } = useT();
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
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
      aria-label={fs ? t("shell.exitFs") : t("shell.enterFs")}
      className={`rounded-lg border border-[var(--gold)]/60 bg-black/70 backdrop-blur-md p-2.5 text-[var(--gold)] hover:bg-black/90 hover:border-[var(--gold)] transition-colors shadow-[0_0_12px_rgba(212,175,55,0.35)] min-w-[40px] min-h-[40px] flex items-center justify-center ${className}`}
    >
      {fs ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
    </button>
  );
}

/**
 * Top-level shell: global gestures (no-pull-to-refresh, back-block on home)
 * + floating fullscreen toggle ONLY on the home page (/).
 * On /campaign/profile the button is rendered inline by that page itself
 * (next to the logout/back button). On every other route it's hidden.
 */
export function AppShell() {
  const loc = useLocation();

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.overscrollBehaviorY = "contain";
    document.body.style.overscrollBehaviorY = "contain";
    (document.body.style as any).overscrollBehaviorX = "contain";

    const onPop = () => {
      if (window.location.pathname === "/") {
        window.history.pushState(null, "", window.location.href);
      }
    };
    try { window.history.pushState(null, "", window.location.href); } catch {}
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Floating button only on the landing/login screen.
  if (loc.pathname !== "/") return null;
  return <FullscreenButton className="fixed top-2 right-2 z-[200]" />;
}

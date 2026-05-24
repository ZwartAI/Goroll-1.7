// Button click + notification sounds.
import buttonSoundUrl from "@/assets/sounds/button.ogg";

let ctx: AudioContext | null = null;
const KEY = "codice.clickSound";

// Decoded buffer cache for the button click asset.
let buttonBuffer: AudioBuffer | null = null;
let buttonLoading: Promise<AudioBuffer | null> | null = null;

export function isSoundOn(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(KEY) !== "off";
}
export function setSoundOn(on: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, on ? "on" : "off");
}

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

async function loadButtonBuffer(c: AudioContext): Promise<AudioBuffer | null> {
  if (buttonBuffer) return buttonBuffer;
  if (buttonLoading) return buttonLoading;
  buttonLoading = (async () => {
    try {
      const res = await fetch(buttonSoundUrl);
      const arr = await res.arrayBuffer();
      const buf = await c.decodeAudioData(arr);
      buttonBuffer = buf;
      return buf;
    } catch {
      return null;
    }
  })();
  return buttonLoading;
}

/** Preload the button click sound (call once after first user gesture). */
export function preloadButtonSound() {
  const c = ensureCtx();
  if (!c) return;
  loadButtonBuffer(c);
}

function playFallbackClick(c: AudioContext) {
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(680, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(320, c.currentTime + 0.07);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.08, c.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.09);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.1);
  } catch { /* ignore */ }
}

export function playClick() {
  if (!isSoundOn()) return;
  const c = ensureCtx();
  if (!c) return;
  if (buttonBuffer) {
    try {
      const src = c.createBufferSource();
      src.buffer = buttonBuffer;
      const g = c.createGain();
      g.gain.value = 0.55;
      src.connect(g).connect(c.destination);
      src.start();
      return;
    } catch { /* fall through */ }
  }
  // Trigger async load and play fallback once.
  loadButtonBuffer(c);
  playFallbackClick(c);
}

/** Subtle "ding" bell for notifications (synthetic, no asset). */
export function playNotification() {
  if (!isSoundOn()) return;
  const c = ensureCtx();
  if (!c) return;
  try {
    const now = c.currentTime;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    g.connect(c.destination);

    const tones = [1320, 1760]; // gentle two-tone bell
    tones.forEach((freq, i) => {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(freq, now + i * 0.06);
      o.connect(g);
      o.start(now + i * 0.06);
      o.stop(now + 0.75);
    });
  } catch { /* ignore */ }
}

/** Mounts a global click listener on <button>, [role=button], <a>. Idempotent. */
let mounted = false;
export function mountGlobalClickSound() {
  if (typeof window === "undefined" || mounted) return;
  mounted = true;
  document.addEventListener("click", (e) => {
    const t = e.target as HTMLElement | null;
    if (!t) return;
    const el = t.closest("button, a, [role='button'], input[type='button'], input[type='submit']");
    if (el) playClick();
  }, true);
}

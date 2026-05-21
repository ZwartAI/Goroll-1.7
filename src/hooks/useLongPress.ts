import { useRef, useCallback } from "react";

/** Returns props to spread on an element for long-press detection (touch + mouse). */
export function useLongPress(onLongPress: () => void, ms = 450) {
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  const start = useCallback(() => {
    firedRef.current = false;
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => {
      firedRef.current = true;
      onLongPress();
    }, ms);
  }, [onLongPress, ms]);

  const cancel = useCallback(() => {
    if (tRef.current) { clearTimeout(tRef.current); tRef.current = null; }
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchCancel: cancel,
    didLongPress: () => firedRef.current,
  };
}

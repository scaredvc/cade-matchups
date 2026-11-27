import { useEffect, useRef, useState } from "react";

/** Tracks an element's content width so SVG charts can redraw on resize. */
export function useWidth<T extends HTMLElement>(initial = 900) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => entry && setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

// Layout settles once. Only the horizontal position is animated, so charts do
// not measure a different width on every animation frame.
const movements = new WeakMap<HTMLElement, Animation>();

export function usePanelLayout(state: boolean) {
  const root = useRef<HTMLDivElement>(null);
  const before = useRef<Map<HTMLElement, number> | null>(null);
  const owned = useRef<Animation[]>([]);

  const prepare = useCallback(() => {
    if (!root.current) return;
    const elements = [...root.current.querySelectorAll<HTMLElement>("[data-shell-flip]")];
    // Read visual positions before canceling an interrupted transition.
    before.current = new Map(elements.map(element => [element, element.getBoundingClientRect().left]));
    for (const element of elements) movements.get(element)?.cancel();
  }, []);

  useLayoutEffect(() => {
    const positions = before.current;
    before.current = null;
    if (!positions || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    owned.current = owned.current.filter(animation => animation.playState === "running");
    for (const [element, left] of positions) {
      if (!element.isConnected) continue;
      const distance = left - element.getBoundingClientRect().left;
      if (Math.abs(distance) < 1) continue;
      const animation = element.animate(
        [{ transform: `translateX(${distance}px)` }, { transform: "translateX(0)" }],
        { duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" },
      );
      movements.set(element, animation);
      owned.current.push(animation);
    }
  }, [state]);

  useEffect(() => () => owned.current.forEach(animation => animation.cancel()), []);
  return { root, prepare };
}

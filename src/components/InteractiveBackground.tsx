"use client";

/*
  InteractiveBackground.tsx — фиксированный фон-слой под всем интерфейсом.

  За курсором следует кобальтовое свечение, и в радиусе вокруг него
  проявляется яркое точечное поле («спецлист оживает под курсором»).
  Позиция передаётся в CSS через --mx/--my; вся отрисовка — в globals.css
  (.interactive-bg). Обновление координат троттлится через requestAnimationFrame.
*/

import { useEffect, useRef } from "react";

export default function InteractiveBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--mx", `${e.clientX}px`);
        el.style.setProperty("--my", `${e.clientY}px`);
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} className="interactive-bg" aria-hidden="true" />;
}

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

interface PlateCursorProps {
  active: boolean;
}

/** Fraction of the remaining distance covered each frame: a short, eased trail. */
const FOLLOW = 0.3;

/**
 * Point-of-light cursor for fine pointers (hidden on touch via CSS). Position is written
 * straight to the DOM so following the pointer never re-renders React.
 */
export function PlateCursor({ active }: PlateCursorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };
    let frame = 0;

    const render = () => {
      const t = reducedMotion ? 1 : FOLLOW;
      pos.x += (target.x - pos.x) * t;
      pos.y += (target.y - pos.y) * t;
      el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      frame = Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) > 0.1 ? requestAnimationFrame(render) : 0;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      if (el.dataset.visible !== "true") {
        pos.x = e.clientX;
        pos.y = e.clientY;
        el.dataset.visible = "true";
      }
      target.x = e.clientX;
      target.y = e.clientY;
      if (!frame) frame = requestAnimationFrame(render);
    };
    const hide = () => {
      el.dataset.visible = "false";
    };
    // pointerleave on the root misses exits into browser chrome; mouseout with no
    // relatedTarget fires whenever the pointer leaves the document.
    const onOut = (e: MouseEvent) => {
      if (!e.relatedTarget) hide();
    };

    window.addEventListener("pointermove", onMove);
    document.addEventListener("mouseout", onOut);
    window.addEventListener("blur", hide);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseout", onOut);
      window.removeEventListener("blur", hide);
    };
  }, [reducedMotion]);

  return (
    <div ref={ref} className="plate-cursor" data-active={active} data-visible="false" aria-hidden="true">
      <span className="plate-cursor__ring" />
      <span className="plate-cursor__dot" />
    </div>
  );
}

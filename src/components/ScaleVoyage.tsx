import { useEffect, useRef } from "react";
import type { Milestone } from "../data/plates";
import {
  AU_PER_LY,
  IDENTITY_STAGE,
  innerStage,
  outerStage,
  ringOpacity,
  ringRadius,
  solPoint,
  stageCss,
  swapScale,
  voyageScale,
  VOYAGE_MS,
  VOYAGE_SKIP_MS,
  type StageRef,
  type VoyageEnds,
} from "../scene/voyage";

interface ScaleVoyageProps {
  /** Out: from the inner plate to the outer one. In: the reverse. */
  direction: "out" | "in";
  ends: VoyageEnds;
  milestones: Milestone[];
  width: number;
  height: number;
  /** Read every frame by the 3D scene. */
  stage: StageRef;
  /** The plate element: the line work and labels follow the CSS variables set on it. */
  root: HTMLElement;
  /** Swap the plates: called once, while neither shows. */
  onSwap: () => void;
  onDone: () => void;
}

/** "340 AU", "12,000 AU", "1.6 light-years". */
export function formatSpan(au: number): string {
  if (au < 0.25 * AU_PER_LY) {
    const rounded = au < 1000 ? Math.round(au / 10) * 10 : Math.round(au / 1000) * 1000;
    return `${rounded.toLocaleString("en-US")} AU`;
  }
  const ly = au / AU_PER_LY;
  return `${ly < 10 ? ly.toFixed(1) : Math.round(ly)} light-years`;
}

/**
 * The voyage between scales: drives the stage transform of both plates through one
 * continuous logarithmic zoom, and draws what lies between them: true-scale rings at each
 * milestone, sweeping inward as the view pulls back, and the Sun as a lone point of light
 * while neither plate shows. Any click, key, or scroll hurries it to the end.
 */
export function ScaleVoyage({ direction, ends, milestones, width, height, stage, root, onSwap, onDone }: ScaleVoyageProps) {
  const ringRefs = useRef<(SVGGElement | null)[]>([]);
  const solRef = useRef<HTMLDivElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);
  // The callbacks may change identity while the voyage runs; read the latest.
  const callbacks = useRef({ onSwap, onDone });
  callbacks.current = { onSwap, onDone };

  useEffect(() => {
    const start = performance.now();
    const zSwap = swapScale(ends);
    let swapped = false;
    let skipAt = 0;
    let skipFrom = 0;
    let t = 0;
    let raf = 0;

    const draw = (z: number) => {
      const showingOuter = direction === "out" ? swapped : !swapped;
      const st = showingOuter ? outerStage(z, ends) : innerStage(z, ends);
      stage.current = st;
      root.style.setProperty("--stage-transform", stageCss(st));
      root.style.setProperty("--stage-opacity", st.opacity.toFixed(3));

      const sol = solPoint(z, ends);
      const reach = Math.max(Math.hypot(sol.x, sol.y), Math.hypot(width - sol.x, sol.y), Math.hypot(sol.x, height - sol.y), Math.hypot(width - sol.x, height - sol.y));
      if (solRef.current) {
        solRef.current.style.transform = `translate(${sol.x.toFixed(1)}px, ${sol.y.toFixed(1)}px)`;
        solRef.current.style.opacity = sol.opacity.toFixed(3);
      }
      milestones.forEach((m, i) => {
        const g = ringRefs.current[i];
        if (!g) return;
        const r = ringRadius(m.au, z, ends);
        const opacity = ringOpacity(r, reach);
        g.style.opacity = opacity.toFixed(3);
        g.style.visibility = opacity < 0.01 ? "hidden" : "visible";
        if (opacity < 0.01) return;
        const circle = g.querySelector("circle")!;
        circle.setAttribute("cx", sol.x.toFixed(1));
        circle.setAttribute("cy", sol.y.toFixed(1));
        circle.setAttribute("r", r.toFixed(1));
        // The name sits where the ring crosses the upper right, on screen while the ring is.
        const a = -Math.PI / 4;
        const text = g.querySelector("text")!;
        text.setAttribute("transform", `translate(${(sol.x + r * Math.cos(a) + 10).toFixed(1)} ${(sol.y + r * Math.sin(a)).toFixed(1)})`);
      });
      if (spanRef.current) spanRef.current.textContent = formatSpan((2 * reach * ends.inner.auPerPx) / z);
    };

    const finish = () => {
      stage.current = IDENTITY_STAGE;
      root.style.removeProperty("--stage-transform");
      root.style.removeProperty("--stage-opacity");
      callbacks.current.onDone();
    };

    const frame = (now: number) => {
      t = skipAt ? skipFrom + ((now - skipAt) / VOYAGE_SKIP_MS) * (1 - skipFrom) : (now - start) / VOYAGE_MS;
      t = Math.min(1, t);
      const z = voyageScale(direction === "out" ? t : 1 - t, ends);
      if (!swapped && (direction === "out" ? z < zSwap : z > zSwap)) {
        swapped = true;
        callbacks.current.onSwap();
      }
      draw(z);
      if (t < 1) raf = requestAnimationFrame(frame);
      else finish();
    };

    const skip = () => {
      if (skipAt) return;
      skipAt = performance.now();
      skipFrom = t;
    };
    // Capture, so a key that hurries the voyage doesn't also act on the page beneath it.
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      skip();
    };
    window.addEventListener("pointerdown", skip, true);
    window.addEventListener("wheel", skip, { capture: true, passive: true });
    window.addEventListener("keydown", onKey, true);
    draw(voyageScale(direction === "out" ? 0 : 1, ends));
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", skip, true);
      window.removeEventListener("wheel", skip, true);
      window.removeEventListener("keydown", onKey, true);
    };
    // The voyage runs once, from its first props; a new voyage mounts a new overlay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="voyage" data-direction={direction} aria-hidden="true">
      <svg className="voyage__rings" width={width} height={height}>
        {milestones.map((m, i) => (
          <g
            key={m.name}
            className="voyage__ring"
            ref={(el) => {
              ringRefs.current[i] = el;
            }}
          >
            <circle />
            <text>
              <tspan className="voyage__ring-name" x="0" dy="0">
                {m.name}
              </tspan>
              <tspan className="voyage__ring-note" x="0" dy="18">
                {m.note}
              </tspan>
            </text>
          </g>
        ))}
      </svg>
      <div className="voyage__sol" ref={solRef}>
        <span className="voyage__sol-name">The Sun</span>
      </div>
      <p className="voyage__span">
        <span className="voyage__span-label">Across this view</span> <span ref={spanRef} className="voyage__span-value" />
      </p>
      <p className="voyage__skip">Click to arrive</p>
    </div>
  );
}

import { useEffect, useRef } from "react";
import type { Milestone } from "../data/plates";
import {
  formatSpan,
  IDENTITY_STAGE,
  innerStage,
  outerStage,
  ringOpacity,
  ringRadius,
  solPoint,
  stageCss,
  swapScale,
  voyageScale,
  hurryVoyageClock,
  startVoyageClock,
  tickVoyageClock,
  type StageRef,
  type VoyageEnds,
} from "../scene/voyage";

/** The layers that move with the plate: its line work, and its labels. */
const STAGED = ".hud-layer, .plate-stage";

interface ScaleVoyageProps {
  /** Out: from the inner plate to the outer one. In: the reverse. */
  direction: "out" | "in";
  ends: VoyageEnds;
  milestones: Milestone[];
  width: number;
  height: number;
  /** Read every frame by the 3D scene. */
  stage: StageRef;
  /** The plate element: its line work and labels (STAGED) follow the stage transform. */
  root: HTMLElement;
  /** Swap the plates: called once, while neither shows. */
  onSwap: () => void;
  onDone: () => void;
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
  const rootRef = useRef<HTMLDivElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);
  // The callbacks may change identity while the voyage runs; read the latest.
  const callbacks = useRef({ onSwap, onDone });
  callbacks.current = { onSwap, onDone };

  useEffect(() => {
    let clock = startVoyageClock(performance.now());
    const zSwap = swapScale(ends);
    let swapped = false;
    let raf = 0;
    /** Each ring name's width, measured once. */
    const labelWidths: number[] = [];

    const draw = (z: number) => {
      const showingOuter = direction === "out" ? swapped : !swapped;
      const st = showingOuter ? outerStage(z, ends) : innerStage(z, ends);
      stage.current = st;
      // Written straight onto the two moving layers: a CSS variable on the plate would make
      // the browser restyle every element on the page, every frame.
      const transform = stageCss(st);
      const opacity = st.lines.toFixed(3);
      for (const el of root.querySelectorAll<HTMLElement | SVGElement>(STAGED)) {
        el.style.transform = transform;
        el.style.opacity = opacity;
      }

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
        // Rings stay clear of the chart's own line work, whether it is arriving or leaving.
        const opacity = ringOpacity(r, reach) * (1 - outerStage(z, ends).lines);
        g.style.opacity = opacity.toFixed(3);
        g.style.visibility = opacity < 0.01 ? "hidden" : "visible";
        if (opacity < 0.01) return;
        const circle = g.querySelector("circle")!;
        circle.setAttribute("cx", sol.x.toFixed(1));
        circle.setAttribute("cy", sol.y.toFixed(1));
        circle.setAttribute("r", r.toFixed(1));
        // The name sits where the ring crosses the upper right, on screen while the ring is.
        // The name sits where the ring crosses the upper right, or the upper left (set flush
        // right) if it wouldn't fit; hidden if neither fits, or under the masthead. Only a large
        // ring carries its name, so names on small, close rings never collide.
        const text = g.querySelector("text")!;
        const textWidth = (labelWidths[i] ??= text.getBBox().width);
        const up = sol.y - r * Math.SQRT1_2;
        const right = sol.x + r * Math.SQRT1_2 + 10;
        const left = sol.x - r * Math.SQRT1_2 - 10;
        const fitsRight = right + textWidth < width - 16;
        const fitsLeft = left - textWidth > 16;
        text.setAttribute("text-anchor", fitsRight ? "start" : "end");
        text.setAttribute("transform", `translate(${(fitsRight ? right : left).toFixed(1)} ${up.toFixed(1)})`);
        text.style.opacity = r > 140 && (fitsRight || fitsLeft) && up > 90 && up < height - 90 ? "1" : "0";
      });
      if (spanRef.current) spanRef.current.textContent = formatSpan((width * ends.inner.auPerPx) / z);
    };

    const finish = () => {
      stage.current = IDENTITY_STAGE;
      for (const el of root.querySelectorAll<HTMLElement | SVGElement>(STAGED)) {
        el.style.removeProperty("transform");
        el.style.removeProperty("opacity");
      }
      callbacks.current.onDone();
    };

    const frame = (now: number) => {
      clock = tickVoyageClock(clock, now);
      const t = clock.t;
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
      if (clock.hurried) return;
      clock = hurryVoyageClock(clock);
      rootRef.current?.setAttribute("data-skipped", "true");
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
    <div className="voyage" ref={rootRef} data-direction={direction} aria-hidden="true">
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

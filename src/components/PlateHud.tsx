import type { CSSProperties } from "react";
import { hourAngle } from "../scene/layout/neighbourhoodPlate";
import type { ChartEngraving, PlateLayout, PlanetPlacement } from "../scene/layout/solarPlate";

interface PlateHudProps {
  layout: PlateLayout;
  hoveredId: string | null;
}

/** Spacing of the engraved scale ticks along each arc, in radians (2.5 degrees). */
const TICK_STEP = (2.5 * Math.PI) / 180;
const HALO_GAP = 8;

type HudState = "rest" | "active" | "dimmed";

/**
 * Line work over the 3D layer, drawn like the engraved rings of an astrolabe:
 * gold orbit arcs with scale ticks (masked around each planet), leader lines to
 * the labels, and the halo shown on hover. No SVG filters: glows are a second,
 * wider, faint stroke, which keeps hover transitions cheap to repaint.
 */
export function PlateHud({ layout, hoveredId }: PlateHudProps) {
  const { width, height, inset, sun, planets } = layout;
  // The Sun has a leader and a hover halo like the planets, but no orbit arc.
  const bodies = [layout.star, ...planets];
  const stateOf = (id: string): HudState => (hoveredId === null ? "rest" : hoveredId === id ? "active" : "dimmed");

  return (
    <svg className="hud-layer" width={width} height={height} aria-hidden="true">
      <defs>
        <clipPath id="hud-bounds">
          <rect x={inset} y={inset} width={width - inset * 2} height={height - inset * 2} />
        </clipPath>
        {/* Arcs stop short of each planet instead of drawing across it. */}
        <mask id="arc-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
          <rect width={width} height={height} fill="white" />
          {planets.map((p) => (
            <circle key={p.body.id} cx={p.x} cy={p.y} r={p.r + 4} fill="black" />
          ))}
        </mask>
      </defs>

      <g clipPath="url(#hud-bounds)" mask="url(#arc-mask)">
        {layout.chart ? (
          <Chart chart={layout.chart} sun={sun} planets={planets} hoveredId={hoveredId} stateOf={stateOf} />
        ) : (
          planets.map((p) => <OrbitArc key={p.body.id} p={p} sun={sun} state={stateOf(p.body.id)} />)
        )}
      </g>

      {bodies.map((p) => {
        const c = p.connector;
        // A name set right under or over its point needs no leader.
        if (p.labelSide === 0) return null;
        return (
          <g key={p.body.id} className="hud-leader" data-state={stateOf(p.body.id)} style={{ "--i": p.order } as CSSProperties}>
            <polyline points={`${c.x0},${c.y0} ${c.x1},${c.y1} ${c.x2},${c.y1}`} />
            <circle cx={c.x0} cy={c.y0} r={1.4} />
          </g>
        );
      })}

      {/* On the galaxy, whose stars crowd behind them, each landmark is marked with a fine ring. */}
      {layout.galaxy &&
        planets.map((p) => (
          <circle key={p.body.id} className="hud-mark" data-state={stateOf(p.body.id)} cx={p.x} cy={p.y} r={p.r + 4} />
        ))}

      {bodies.map((p) => {
        const R = p.reach + HALO_GAP;
        return (
          <g key={p.body.id} className="hud-halo" data-state={stateOf(p.body.id)}>
            <circle className="hud-halo__glow" cx={p.x} cy={p.y} r={R} />
            <circle className="hud-halo__line" cx={p.x} cy={p.y} r={R} />
          </g>
        );
      })}
    </svg>
  );
}

function OrbitArc({ p, sun, state }: { p: PlanetPlacement; sun: { x: number; y: number }; state: HudState }) {
  const a0 = p.angle - p.arcSpan;
  const a1 = p.angle + p.arcSpan;
  const R = p.orbitR;

  // One path for every tick on this arc; every fourth tick is long, like a degree scale.
  let ticks = "";
  const count = Math.floor((a1 - a0) / TICK_STEP);
  for (let k = 0; k <= count; k++) {
    const a = a0 + k * TICK_STEP;
    const len = k % 4 === 0 ? 6 : 3;
    ticks += `M ${polar(sun, R, a)} L ${polar(sun, R + len, a)} `;
  }

  return (
    <g
      className="hud-arc"
      data-state={state}
      data-kind={p.body.kind ?? "planet"}
      style={{ "--i": p.order } as CSSProperties}
    >
      <path className="hud-arc__glow" d={arcPath(sun, R, a0, a1)} />
      {/* pathLength lets the entrance draw the line in; dashed (dwarf) orbits fade instead. */}
      <path className="hud-arc__line" d={arcPath(sun, R, a0, a1)} pathLength={p.body.kind === "dwarf" ? undefined : 1} />
      <path className="hud-arc__ticks" d={ticks} />
      <circle className="hud-arc__end" cx={sun.x + R * Math.cos(a0)} cy={sun.y + R * Math.sin(a0)} r={2} />
      <circle className="hud-arc__end" cx={sun.x + R * Math.cos(a1)} cy={sun.y + R * Math.sin(a1)} r={2} />
    </g>
  );
}

/**
 * A to-scale chart's engraving: distance rings, a dial at the rim (the neighbourhood's hour
 * dial of right ascension), and a faint sight line from the Sun to each body that brightens
 * on hover. The layout places everything; rings open toward the title, like partial arcs.
 */
function Chart({
  chart,
  sun,
  planets,
  hoveredId,
  stateOf,
}: {
  chart: ChartEngraving;
  sun: { x: number; y: number; r: number };
  planets: PlanetPlacement[];
  hoveredId: string | null;
  stateOf: (id: string) => HudState;
}) {
  const ringState: HudState = hoveredId === null ? "rest" : "dimmed";
  const { gap } = chart;
  // Sight lines run from the Sun; rings and the dial circle the chart's own centre.
  const c = chart.centre ?? sun;
  // Each ring runs the long way round, from the opening's far side to its near side.
  const from = gap.to;
  const to = gap.from + Math.PI * 2;
  const inGap = (a: number) => {
    const mid = (gap.from + gap.to) / 2;
    return Math.abs(Math.atan2(Math.sin(a - mid), Math.cos(a - mid))) < (gap.to - gap.from) / 2;
  };
  let hourTicks = "";
  for (let k = 0; chart.hours.length > 0 && k < 48; k++) {
    const a = hourAngle(k / 2, chart.zeroHour);
    if (inGap(a)) continue;
    const len = k % 12 === 0 ? 9 : k % 2 === 0 ? 5 : 2.5;
    hourTicks += `M ${polar(c, chart.dial, a)} L ${polar(c, chart.dial + len, a)} `;
  }
  const rings = [...chart.rings, { r: chart.dial, strong: true }];

  return (
    <>
      {rings.map((ring, i) => (
        <g key={ring.r} className="hud-arc" data-kind="ring" data-state={ringState} style={{ "--i": i } as CSSProperties}>
          <path
            className="hud-arc__line"
            d={`M ${polar(c, ring.r, from)} A ${ring.r} ${ring.r} 0 1 1 ${polar(c, ring.r, to)}`}
            pathLength={1}
            data-faint={!ring.strong}
          />
          <circle className="hud-arc__end" cx={c.x + ring.r * Math.cos(from)} cy={c.y + ring.r * Math.sin(from)} r={2} />
          <circle className="hud-arc__end" cx={c.x + ring.r * Math.cos(to)} cy={c.y + ring.r * Math.sin(to)} r={2} />
        </g>
      ))}
      <g className="hud-arc" data-kind="dial" data-state={ringState} style={{ "--i": rings.length } as CSSProperties}>
        <path className="hud-arc__ticks" d={hourTicks} />
        {chart.hours.map((l) => (
          <text key={l.h} className="hud-chart__label" x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle">
            {l.h}h
          </text>
        ))}
      </g>
      {planets.map((p) => {
        const dx = Math.cos(p.angle);
        const dy = Math.sin(p.angle);
        return (
          <line
            key={p.body.id}
            className="hud-ray"
            data-state={stateOf(p.body.id)}
            style={{ "--i": p.order } as CSSProperties}
            x1={sun.x + dx * (sun.r + 6)}
            y1={sun.y + dy * (sun.r + 6)}
            x2={p.x - dx * (p.r + 6)}
            y2={p.y - dy * (p.r + 6)}
          />
        );
      })}
    </>
  );
}

function arcPath(c: { x: number; y: number }, r: number, a0: number, a1: number) {
  return `M ${polar(c, r, a0)} A ${r} ${r} 0 0 1 ${polar(c, r, a1)}`;
}

function polar(c: { x: number; y: number }, r: number, a: number) {
  return `${(c.x + r * Math.cos(a)).toFixed(2)} ${(c.y + r * Math.sin(a)).toFixed(2)}`;
}

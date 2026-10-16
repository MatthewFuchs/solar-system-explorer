import type { PlateLayout, PlanetPlacement } from "../scene/plateLayout";

interface PlateHudProps {
  layout: PlateLayout;
  hoveredId: string | null;
}

const TICK = 5;
const RETICLE_GAP = 9;

type HudState = "rest" | "active" | "dimmed";

/**
 * Vector HUD over the 3D layer: orbit arcs (masked around each planet), elbow
 * connectors to the labels, and the selection reticle shown on hover.
 */
export function PlateHud({ layout, hoveredId }: PlateHudProps) {
  const { width, height, inset, sun, planets } = layout;
  const stateOf = (id: string): HudState => (hoveredId === null ? "rest" : hoveredId === id ? "active" : "dimmed");

  return (
    <svg className="hud-layer" width={width} height={height} aria-hidden="true">
      <defs>
        <filter id="hud-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="hud-bounds">
          <rect x={inset} y={inset} width={width - inset * 2} height={height - inset * 2} />
        </clipPath>
        {/* Arcs stop short of each planet instead of drawing across it. */}
        <mask id="arc-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
          <rect width={width} height={height} fill="white" />
          {planets.map((p) => (
            <circle key={p.body.id} cx={p.x} cy={p.y} r={p.r + 3} fill="black" />
          ))}
        </mask>
      </defs>

      <g clipPath="url(#hud-bounds)" mask="url(#arc-mask)" filter="url(#hud-glow)">
        {planets.map((p) => (
          <OrbitArc key={p.body.id} p={p} sun={sun} state={stateOf(p.body.id)} />
        ))}
      </g>

      <g filter="url(#hud-glow)">
        {planets.map((p) => {
          const c = p.connector;
          return (
            <g key={p.body.id} className="hud-connector" data-state={stateOf(p.body.id)}>
              <polyline points={`${c.x0},${c.y0} ${c.x1},${c.y1} ${c.x2},${c.y1}`} />
              <circle cx={c.x0} cy={c.y0} r={1.6} />
            </g>
          );
        })}
        {planets.map((p) => (
          <Reticle key={p.body.id} p={p} state={stateOf(p.body.id)} />
        ))}
      </g>
    </svg>
  );
}

function OrbitArc({ p, sun, state }: { p: PlanetPlacement; sun: { x: number; y: number }; state: HudState }) {
  const a0 = p.angle - p.arcSpan;
  const a1 = p.angle + p.arcSpan;
  const R = p.orbitR;
  return (
    <g className="hud-arc" data-state={state}>
      <path d={`M ${polar(sun, R, a0)} A ${R} ${R} 0 0 1 ${polar(sun, R, a1)}`} />
      {/* Bracket ends: a tick across the arc with a short return toward the planet. */}
      <path d={`M ${polar(sun, R - TICK, a0)} L ${polar(sun, R + TICK, a0)}`} />
      <path d={`M ${polar(sun, R - TICK, a1)} L ${polar(sun, R + TICK, a1)}`} />
      <path d={`M ${polar(sun, R + TICK, a0)} A ${R + TICK} ${R + TICK} 0 0 1 ${polar(sun, R + TICK, a0 + 0.012)}`} />
      <path d={`M ${polar(sun, R + TICK, a1)} A ${R + TICK} ${R + TICK} 0 0 0 ${polar(sun, R + TICK, a1 - 0.012)}`} />
    </g>
  );
}

/** Selection ring with four cardinal ticks; scales in when its planet is hovered. */
function Reticle({ p, state }: { p: PlanetPlacement; state: HudState }) {
  const R = p.reach + RETICLE_GAP;
  const ticks: [number, number][] = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  return (
    <g className="hud-reticle" data-state={state}>
      <circle cx={p.x} cy={p.y} r={R} />
      {ticks.map(([dx, dy]) => (
        <line
          key={`${dx},${dy}`}
          x1={p.x + dx * (R + 3)}
          y1={p.y + dy * (R + 3)}
          x2={p.x + dx * (R + 9)}
          y2={p.y + dy * (R + 9)}
        />
      ))}
    </g>
  );
}

function polar(c: { x: number; y: number }, r: number, a: number) {
  return `${(c.x + r * Math.cos(a)).toFixed(2)} ${(c.y + r * Math.sin(a)).toFixed(2)}`;
}

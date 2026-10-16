import type { PlateLayout } from "../scene/plateLayout";

interface PlateArcsProps {
  layout: PlateLayout;
  hoveredId: string | null;
}

const TICK = 5;

/** Back layer, drawn under the spheres: the Sun's glow and partial orbit arcs. */
export function PlateArcs({ layout, hoveredId }: PlateArcsProps) {
  const { width, height, frameInset, sun, planets } = layout;

  return (
    <svg className="plate-layer" width={width} height={height} aria-hidden="true">
      <defs>
        <radialGradient id="sun-glow" cx={sun.x} cy={sun.y} r={sun.r * 2.4} gradientUnits="userSpaceOnUse">
          <stop offset="0.35" stopColor="var(--gilt)" stopOpacity="0.16" />
          <stop offset="1" stopColor="var(--gilt)" stopOpacity="0" />
        </radialGradient>
        <clipPath id="plate-inner">
          <rect x={frameInset} y={frameInset} width={width - frameInset * 2} height={height - frameInset * 2} />
        </clipPath>
      </defs>
      <circle cx={sun.x} cy={sun.y} r={sun.r * 2.4} fill="url(#sun-glow)" />

      <g clipPath="url(#plate-inner)">
        {planets.map((p) => {
          const a0 = p.angle - p.arcSpan;
          const a1 = p.angle + p.arcSpan;
          const state = hoveredId === null ? "rest" : hoveredId === p.body.id ? "active" : "dimmed";
          return (
            <g key={p.body.id} className="plate-arc" data-state={state}>
              <path
                d={`M ${polar(sun, p.orbitR, a0)} A ${p.orbitR} ${p.orbitR} 0 0 1 ${polar(sun, p.orbitR, a1)}`}
              />
              {/* Engraver's ticks closing each arc. */}
              <path d={`M ${polar(sun, p.orbitR - TICK, a0)} L ${polar(sun, p.orbitR + TICK, a0)}`} />
              <path d={`M ${polar(sun, p.orbitR - TICK, a1)} L ${polar(sun, p.orbitR + TICK, a1)}`} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function polar(c: { x: number; y: number }, r: number, a: number) {
  return `${(c.x + r * Math.cos(a)).toFixed(2)} ${(c.y + r * Math.sin(a)).toFixed(2)}`;
}

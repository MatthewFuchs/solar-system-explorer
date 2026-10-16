import { formatAU, toRoman } from "../lib/format";
import type { PlateLayout } from "../scene/plateLayout";

interface PlateLabelsProps {
  layout: PlateLayout;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}

const LEADER_GAP = 6;
const LEADER_LENGTH = 26;

/**
 * Front layers: hairline outlines and leader lines (SVG), the editorial labels,
 * and an invisible focusable hit target over each planet.
 */
export function PlateLabels({ layout, hoveredId, onHover }: PlateLabelsProps) {
  const { width, height, planets } = layout;
  const stateOf = (id: string) => (hoveredId === null ? "rest" : hoveredId === id ? "active" : "dimmed");

  return (
    <>
      <svg className="plate-layer plate-layer--front" width={width} height={height} aria-hidden="true">
        {planets.map((p) => {
          const x0 = p.x + p.labelSide * (p.r + LEADER_GAP);
          const x1 = p.x + p.labelSide * (p.r + LEADER_GAP + LEADER_LENGTH);
          return (
            <g key={p.body.id} className="plate-mark" data-state={stateOf(p.body.id)}>
              <circle cx={p.x} cy={p.y} r={p.r + 0.5} />
              <line x1={x0} y1={p.y} x2={x1} y2={p.y} />
            </g>
          );
        })}
      </svg>

      {planets.map((p) => {
        const hitR = Math.max(p.r + 10, 22);
        const labelX = p.x + p.labelSide * (p.r + LEADER_GAP + LEADER_LENGTH + 8);
        const numeral = toRoman(p.order);
        const au = p.body.distanceAU;
        return (
          <div key={p.body.id}>
            <div
              className="plate-label"
              data-side={p.labelSide === 1 ? "right" : "left"}
              data-state={stateOf(p.body.id)}
              style={{ left: labelX, top: p.y }}
              aria-hidden="true"
            >
              <span className="plate-label__numeral">{numeral}</span>
              <span className="plate-label__detail">
                <span className="plate-label__name">{p.body.name}</span>
                {au !== undefined && <span className="plate-label__au">{formatAU(au)}</span>}
              </span>
            </div>
            <button
              type="button"
              className="plate-hit"
              style={{ left: p.x - hitR, top: p.y - hitR, width: hitR * 2, height: hitR * 2 }}
              aria-label={`${numeral}. ${p.body.name}${au !== undefined ? `, ${formatAU(au)} from the Sun` : ""}`}
              onPointerEnter={() => onHover(p.body.id)}
              onPointerLeave={() => onHover(null)}
              onFocus={() => onHover(p.body.id)}
              onBlur={() => onHover(null)}
            />
          </div>
        );
      })}
    </>
  );
}

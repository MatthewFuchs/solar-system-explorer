import type { CSSProperties } from "react";
import { formatAU, toRoman } from "../lib/format";
import type { PlateLayout } from "../scene/plateLayout";

interface DestinationLabelsProps {
  layout: PlateLayout;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}

/** Game-map destination labels, plus an invisible focusable hit target over each planet. */
export function DestinationLabels({ layout, hoveredId, onHover }: DestinationLabelsProps) {
  const stateOf = (id: string) => (hoveredId === null ? "rest" : hoveredId === id ? "active" : "dimmed");

  return (
    <>
      {layout.planets.map((p) => {
        const hitR = Math.max(p.r + 10, 22);
        const numeral = toRoman(p.order);
        const au = p.body.distanceAU;
        // Room between the label node and the screen edge, so the expanded tagline never clips.
        const room = p.labelSide === 1 ? layout.width - p.connector.x2 : p.connector.x2;
        const style = {
          left: p.connector.x2,
          top: p.connector.y1,
          "--label-room": `${Math.max(120, room - layout.inset - 24)}px`,
        } as CSSProperties;
        return (
          <div key={p.body.id}>
            <div
              className="dest-label"
              data-side={p.labelSide === 1 ? "right" : "left"}
              data-state={stateOf(p.body.id)}
              style={style}
              aria-hidden="true"
            >
              {/* Four-point star. */}
              <svg className="dest-label__node" viewBox="0 0 12 12" width="12" height="12">
                <path d="M6 0 C6.4 4 8 5.6 12 6 C8 6.4 6.4 8 6 12 C5.6 8 4 6.4 0 6 C4 5.6 5.6 4 6 0 Z" />
              </svg>
              <div className="dest-label__text">
                <span className="dest-label__name">{p.body.name}</span>
                <span className="dest-label__meta">
                  <span>{numeral}</span>
                  <span className="dest-label__rule" />
                  {au !== undefined && <span>{formatAU(au)}</span>}
                </span>
                <span className="dest-label__more">
                  <span className="dest-label__tagline">{p.body.tagline}</span>
                </span>
              </div>
            </div>
            <button
              type="button"
              className="plate-hit"
              style={{ left: p.x - hitR, top: p.y - hitR, width: hitR * 2, height: hitR * 2 }}
              aria-label={`${p.body.name}, planet ${numeral}${au !== undefined ? `, ${formatAU(au)} from the Sun` : ""}. ${p.body.tagline}`}
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

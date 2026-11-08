import type { CSSProperties } from "react";
import { bodyDistance, bodyMark, bodyNoun } from "../lib/format";
import type { PlateLayout } from "../scene/layout/solarPlate";
import { StatList } from "./StatList";

interface DestinationLabelsProps {
  layout: PlateLayout;
  hoveredId: string | null;
  /** Planet open in planet view; its label is hidden while its name animates elsewhere. */
  focusId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

/** Game-map destination labels, plus an invisible focusable hit target over each planet. */
export function DestinationLabels({ layout, hoveredId, focusId, onHover, onSelect }: DestinationLabelsProps) {
  const stateOf = (id: string) => (hoveredId === null ? "rest" : hoveredId === id ? "active" : "dimmed");

  return (
    <>
      {[layout.star, ...layout.planets].map((p) => {
        const hitR = Math.max(p.r + 10, 22);
        const numeral = bodyMark(p.body, p.order);
        const distance = bodyDistance(p.body);
        // Room between the label node and the screen edge, so the expanded tagline never clips.
        const room = p.labelSide === 1 ? layout.width - p.connector.x2 : p.connector.x2;
        // Left-side labels are anchored by their right edge, so the browser sizes them
        // against the space to their left (where they grow), not the sliver to the right.
        const style = {
          top: p.connector.y1,
          "--label-room": `${Math.max(120, room - layout.inset - 24)}px`,
          "--i": p.order,
        } as CSSProperties;
        if (p.labelSide === 1) style.left = p.connector.x2;
        else style.right = layout.width - p.connector.x2;
        return (
          <div key={p.body.id}>
            <div
              className="dest-label"
              data-planet={p.body.id}
              data-focus={focusId === p.body.id}
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
                  {/* Dwarf planets show only their distance here; the dashed orbit sets them apart. */}
                  {p.body.kind !== "dwarf" && (
                    <>
                      <span className="dest-label__numeral">{numeral}</span>
                      {distance && <span className="dest-label__rule" />}
                    </>
                  )}
                  {distance && <span>{distance.short}</span>}
                </span>
                <div className="dest-label__more">
                  {/* One child, so the grid-row reveal (0fr to 1fr) unfolds tagline and stats together. */}
                  <div className="dest-label__more-inner">
                    <span className="dest-label__tagline">{p.body.tagline}</span>
                    {p.body.stats && p.body.stats.length > 0 && <StatList stats={p.body.stats} variant="label" />}
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="plate-hit"
              style={{ left: p.x - hitR, top: p.y - hitR, width: hitR * 2, height: hitR * 2 }}
              aria-label={`${p.body.name}, ${bodyNoun(p.body, p.order)}${distance ? `, ${distance.long}` : ""}. ${p.body.pois.length ? "Open its view" : "Return to it"}.`}
              onClick={() => onSelect(p.body.id)}
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

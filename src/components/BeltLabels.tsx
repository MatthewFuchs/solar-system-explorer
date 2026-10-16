import type { Belt } from "../data/solarSystem";
import type { BeltShape } from "../scene/plateLayout";

interface BeltLabelsProps {
  shapes: BeltShape[];
  onSelect: (belt: Belt) => void;
  onHover: (hovering: boolean) => void;
}

/** Engraved-style names set along the stippled belts; each opens the belt's details. */
export function BeltLabels({ shapes, onSelect, onHover }: BeltLabelsProps) {
  return (
    <>
      {shapes.map((s) => (
        <button
          key={s.belt.id}
          type="button"
          className="belt-label"
          style={{ transform: `translate(${s.labelX.toFixed(1)}px, ${s.labelY.toFixed(1)}px)` }}
          aria-label={`${s.belt.name}. Open details.`}
          onClick={() => onSelect(s.belt)}
          onPointerEnter={() => onHover(true)}
          onPointerLeave={() => onHover(false)}
        >
          {s.belt.name}
        </button>
      ))}
    </>
  );
}

import { memo, type CSSProperties } from "react";
import type { Spacecraft } from "../data/solarSystem";
import type { SpacecraftSpot } from "../scene/plateLayout";
import { SpacecraftDrawingSvg } from "./spacecraftDrawings";

interface SpacecraftLayerProps {
  spots: SpacecraftSpot[];
  width: number;
  shown: boolean;
  onSelect: (craft: Spacecraft) => void;
  onHover: (hovering: boolean) => void;
}

/** Spacecraft as small line drawings in the overview. Hover or focus reveals name and launch year. */
export const SpacecraftLayer = memo(function SpacecraftLayer({ spots, width, shown, onSelect, onHover }: SpacecraftLayerProps) {
  return (
    <div className="craft-layer" data-shown={shown} inert={!shown}>
      {spots.map(({ craft, x, y }, i) => (
        <button
          key={craft.id}
          type="button"
          className="craft"
          // Labels open toward the side with room.
          data-side={x > width - 240 ? "left" : "right"}
          style={{ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`, "--i": i } as CSSProperties}
          aria-label={`${craft.name}, launched ${craft.launchYear}. Open details.`}
          onClick={() => onSelect(craft)}
          onPointerEnter={() => onHover(true)}
          onPointerLeave={() => onHover(false)}
        >
          <SpacecraftDrawingSvg drawing={craft.drawing} />
          <span className="craft__label" aria-hidden="true">
            <span className="craft__name">{craft.name}</span>
            <span className="craft__year">{craft.launchYear}</span>
          </span>
        </button>
      ))}
    </div>
  );
});

import type { CSSProperties } from "react";
import { isSurfacePOI, type POI } from "../data/solarSystem";
import { orbiterFor } from "../scene/bodyAppearance";
import { SpacecraftDrawingSvg } from "./spacecraftDrawings";

interface PoiMarkersProps {
  pois: POI[];
  activeIndex: number;
  /** Elements are positioned every frame by the 3D layer (PlanetBody), not by React. */
  markerEls: Map<string, HTMLElement>;
  onSelect: (index: number) => void;
  onHover: (hovering: boolean) => void;
}

/**
 * Fine ring-and-crosshair markers on the planet surface. Static: they brighten on
 * hover or when selected, and never animate on their own. Far-side markers are
 * hidden (and so unfocusable) by the 3D layer.
 *
 * Moons and spacecraft are drawn as objects instead (moons in 3D by Orbiters, spacecraft
 * as hairline drawings here); their button covers the object, rings it in gold on hover,
 * and names it beside it. `--obj-r` is the object's radius in pixels.
 */
export function PoiMarkers({ pois, activeIndex, markerEls, onSelect, onHover }: PoiMarkersProps) {
  return (
    <div className="poi-layer">
      {pois.map((poi, i) => {
        const look = isSurfacePOI(poi) ? undefined : orbiterFor(poi.id);
        const style = { visibility: "hidden", opacity: 0 } as CSSProperties & Record<string, string | number>;
        if (look?.kind === "craft") style["--obj-r"] = `${look.size / 2}px`;
        return (
          <button
            key={poi.id}
            ref={(el) => {
              if (el) markerEls.set(poi.id, el);
              else markerEls.delete(poi.id);
            }}
            type="button"
            className="poi-marker"
            data-active={i === activeIndex}
            data-placement={isSurfacePOI(poi) ? "surface" : "orbit"}
            data-object={look?.kind}
            style={style}
            aria-label={`${poi.name}, ${poi.category}`}
            aria-pressed={i === activeIndex}
            onClick={() => onSelect(i)}
            onPointerEnter={() => onHover(true)}
            onPointerLeave={() => onHover(false)}
          >
            {look ? (
              <>
                <span className="poi-marker__halo" aria-hidden="true" />
                {look.kind === "craft" && (
                  <span className="poi-marker__object">
                    <SpacecraftDrawingSvg drawing={look.drawing} size={look.size} />
                  </span>
                )}
              </>
            ) : (
              <svg className="poi-marker__mark" viewBox="-12 -12 24 24" width="24" height="24" aria-hidden="true">
                <circle className="poi-marker__ring" r="6.5" />
                <path className="poi-marker__ticks" d="M0 -11.5V-8.5M11.5 0H8.5M0 11.5V8.5M-11.5 0H-8.5" />
                <circle className="poi-marker__dot" r="1.2" />
              </svg>
            )}
            <span className="poi-marker__name">{poi.name}</span>
          </button>
        );
      })}
    </div>
  );
}

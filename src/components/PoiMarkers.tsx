import type { POI } from "../data/solarSystem";

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
 */
export function PoiMarkers({ pois, activeIndex, markerEls, onSelect, onHover }: PoiMarkersProps) {
  return (
    <div className="poi-layer">
      {pois.map((poi, i) => (
        <button
          key={poi.id}
          ref={(el) => {
            if (el) markerEls.set(poi.id, el);
            else markerEls.delete(poi.id);
          }}
          type="button"
          className="poi-marker"
          data-active={i === activeIndex}
          style={{ visibility: "hidden", opacity: 0 }}
          aria-label={`${poi.name}, ${poi.category}`}
          aria-pressed={i === activeIndex}
          onClick={() => onSelect(i)}
          onPointerEnter={() => onHover(true)}
          onPointerLeave={() => onHover(false)}
        >
          <svg className="poi-marker__mark" viewBox="-12 -12 24 24" width="24" height="24" aria-hidden="true">
            <circle className="poi-marker__ring" r="6.5" />
            <path className="poi-marker__ticks" d="M0 -11.5V-8.5M11.5 0H8.5M0 11.5V8.5M-11.5 0H-8.5" />
            <circle className="poi-marker__dot" r="1.2" />
          </svg>
          <span className="poi-marker__name">{poi.name}</span>
        </button>
      ))}
    </div>
  );
}

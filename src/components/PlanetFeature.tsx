import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CelestialBody } from "../data/solarSystem";
import { bodyMark, formatAU } from "../lib/format";
import { ZOOM_EASING_CSS } from "../scene/viewTransition";
import { PoiMarkers } from "./PoiMarkers";
import { PoiPanel, type PanelState } from "./PoiPanel";
import { StatList } from "./StatList";

export type ViewPhase = "overview" | "entering" | "planet" | "leaving";

interface PlanetFeatureProps {
  planet: CelestialBody;
  order: number;
  phase: ViewPhase;
  poiIndex: number;
  zoomMs: number;
  markerEls: Map<string, HTMLElement>;
  onPoiIndex: (index: number) => void;
  onMarkerHover: (hovering: boolean) => void;
  onBack: () => void;
}

/**
 * Animate `el` from where `source` sits (its overview label) to its own place.
 * Measured once; reversing uses Animation.reverse() so it stays in step with the
 * 3D zoom timeline even when interrupted mid-flight.
 */
function flipFrom(source: Element, el: HTMLElement, ms: number, fadeThrough: boolean) {
  const first = source.getBoundingClientRect();
  const last = el.getBoundingClientRect();
  const options: KeyframeAnimationOptions = { duration: ms, easing: ZOOM_EASING_CSS, fill: "both" };
  // Hidden source (e.g. the numeral on phones): rise into place instead.
  if (!first.width || !last.height) {
    return el.animate([{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], options);
  }
  const scale = first.height / last.height;
  const dx = first.left - last.left;
  const dy = first.top - last.top;
  const from = `translate(${dx}px, ${dy}px) scale(${scale})`;
  // The numeral sits below the name in the label but above it in the column, so their paths
  // cross; it fades out while crossing and settles back in.
  const frames: Keyframe[] = fadeThrough
    ? [
        { transform: from, opacity: 1, offset: 0 },
        { opacity: 0, offset: 0.22 },
        { opacity: 0, offset: 0.6 },
        { transform: "none", opacity: 1, offset: 1 },
      ]
    : [{ transform: from }, { transform: "none" }];
  return el.animate(frames, options);
}

/** Planet view: the magazine-spread text column, POI markers, and controls. */
export function PlanetFeature({
  planet,
  order,
  phase,
  poiIndex,
  zoomMs,
  markerEls,
  onPoiIndex,
  onMarkerHover,
  onBack,
}: PlanetFeatureProps) {
  const numeralRef = useRef<HTMLParagraphElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const anims = useRef<Animation[]>([]);
  const numeral = bodyMark(planet.kind, order);
  const pois = planet.pois;
  const poi = pois[poiIndex];
  const au = planet.distanceAU;
  const [panel, setPanel] = useState<PanelState | "closed">("closed");
  const closePanel = useCallback(() => setPanel((p) => (p === "open" ? "closing" : p)), []);
  const closedPanel = useCallback(() => setPanel("closed"), []);
  // Selecting a marker turns the planet to face it and opens its details.
  const openPanel = (index: number) => {
    onPoiIndex(index);
    setPanel("open");
  };

  // The numeral and name grow out of the overview label and settle into the column.
  useLayoutEffect(() => {
    if (zoomMs <= 0 || (phase !== "entering" && phase !== "leaving")) return;
    const forward = phase === "entering";
    if (anims.current.length) {
      for (const a of anims.current) if (a.playbackRate > 0 !== forward) a.reverse();
      return;
    }
    const label = document.querySelector(`.dest-label[data-planet="${planet.id}"]`);
    const pairs: [string, HTMLElement | null, boolean][] = [
      [".dest-label__numeral", numeralRef.current, true],
      [".dest-label__name", nameRef.current, false],
    ];
    anims.current = pairs.flatMap(([selector, el, fadeThrough]) => {
      const source = label?.querySelector(selector);
      if (!source || !el) return [];
      const a = flipFrom(source, el, zoomMs, fadeThrough);
      if (!forward) a.reverse();
      return [a];
    });
  }, [phase, planet.id, zoomMs]);

  useEffect(() => {
    const running = anims.current;
    return () => running.forEach((a) => a.cancel());
  }, []);

  const step = (dir: 1 | -1) => onPoiIndex((poiIndex + dir + pois.length) % pois.length);

  return (
    <section className="feature" data-phase={phase} aria-labelledby="feature-name">
      <button type="button" className="feature__back feature__rest" onClick={onBack}>
        <span className="feature__back-rule" aria-hidden="true" />
        Back to the system
      </button>

      <div className="feature__column">
        <p className="feature__numeral" ref={numeralRef}>
          {numeral}
        </p>
        <h2 className="feature__name" id="feature-name" ref={nameRef}>
          {planet.name}
        </h2>
        <div className="feature__rest">
          <p className="feature__tagline">{planet.tagline}</p>
          {au !== undefined && <p className="feature__meta">{formatAU(au)} from the Sun</p>}
          {planet.stats && planet.stats.length > 0 && <StatList stats={planet.stats} variant="feature" />}

          {poi && (
            <div className="feature__poi" aria-live="polite">
              <h3 className="feature__poi-name">{poi.name}</h3>
              <p className="feature__poi-category">{poi.category}</p>
              <p className="feature__poi-summary">{poi.summary}</p>
              <button type="button" className="feature__details" onClick={() => setPanel("open")}>
                Open details
              </button>
            </div>
          )}

          {pois.length > 1 && (
            <div className="feature__nav" role="group" aria-label="Points of interest">
              <button type="button" onClick={() => step(-1)} aria-label="Previous point of interest">
                Previous
              </button>
              <span className="feature__count">
                {poiIndex + 1} of {pois.length}
              </span>
              <button type="button" onClick={() => step(1)} aria-label="Next point of interest">
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      <PoiMarkers
        pois={pois}
        activeIndex={poiIndex}
        markerEls={markerEls}
        onSelect={openPanel}
        onHover={onMarkerHover}
      />

      {panel !== "closed" && poi && (
        <PoiPanel
          poi={poi}
          eyebrow={{ mark: planet.kind === "dwarf" || planet.kind === "star" ? undefined : numeral, label: planet.name }}
          state={panel}
          onClose={closePanel}
          onClosed={closedPanel}
        />
      )}
    </section>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BELTS, DESTINATIONS, SPACECRAFT, type Belt, type Spacecraft } from "../data/solarSystem";
import { useElementSize } from "../hooks/useElementSize";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { reachFactor } from "../scene/bodyAppearance";
import { computeFeaturePlacement, computePlateLayout, placeBelts, placeSpacecraft } from "../scene/plateLayout";
import { PlateScene } from "../scene/PlateScene";
import { Timeline, TURN_MS, ZOOM_MS, type ZoomFrame } from "../scene/viewTransition";
import { BeltLabels } from "./BeltLabels";
import { DestinationLabels } from "./DestinationLabels";
import { PlanetFeature, type ViewPhase } from "./PlanetFeature";
import { PlateCursor } from "./PlateCursor";
import { PlateHud } from "./PlateHud";
import { PoiPanel, type PanelState } from "./PoiPanel";
import { SpaceBackdrop } from "./SpaceBackdrop";
import { SpacecraftLayer } from "./SpacecraftLayer";
import { TopBar } from "./TopBar";

/** The destination named in the URL hash (e.g. #mars), if it exists. */
function planetFromHash(): string | null {
  const id = decodeURIComponent(window.location.hash.slice(1));
  return DESTINATIONS.some((p) => p.id === id) ? id : null;
}

/** Something in the overview itself (not on a planet) whose details are open. */
type OverviewDetail = { kind: "spacecraft"; item: Spacecraft } | { kind: "belt"; item: Belt };

/**
 * The solar system: a fixed astrolabe-like overview, and a planet view reached by
 * zooming into a planet. The URL hash names the open planet so views can be linked.
 */
export function Overview() {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const reducedMotion = usePrefersReducedMotion();
  const [initialFocus] = useState(planetFromHash);
  const [focusId, setFocusId] = useState<string | null>(initialFocus);
  const [phase, setPhase] = useState<ViewPhase>(initialFocus ? "planet" : "overview");
  const [poiIndex, setPoiIndex] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [markerHover, setMarkerHover] = useState(false);
  const [showSpacecraft, setShowSpacecraft] = useState(true);
  const [detail, setDetail] = useState<OverviewDetail | null>(null);
  const [detailState, setDetailState] = useState<PanelState>("open");
  const [zoom] = useState(() => new Timeline(initialFocus ? 1 : 0));
  const [markerEls] = useState(() => new Map<string, HTMLElement>());
  const targetRef = useRef<string | null>(initialFocus);
  const timerRef = useRef(0);

  const zoomMs = reducedMotion ? 0 : ZOOM_MS;
  const turnMs = reducedMotion ? 0 : TURN_MS;

  const layout = useMemo(
    () => (size.width > 0 ? computePlateLayout(DESTINATIONS, size.width, size.height) : null),
    [size.width, size.height],
  );
  const beltShapes = useMemo(() => (layout ? placeBelts(layout, BELTS) : []), [layout]);
  // Spacecraft keep clear of the belt labels as well as planets, labels, and the title.
  const craftSpots = useMemo(
    () => (layout ? placeSpacecraft(layout, SPACECRAFT, beltShapes.map((b) => b.labelBox)) : []),
    [layout, beltShapes],
  );

  const focus = layout?.planets.find((p) => p.body.id === focusId) ?? null;
  const zoomFrame = useMemo<ZoomFrame | null>(() => {
    if (!layout || !focus) return null;
    return {
      from: { x: focus.x, y: focus.y, r: focus.r },
      to: computeFeaturePlacement(layout.width, layout.height, reachFactor(focus.body.id)),
    };
  }, [layout, focus]);

  /** Run the transition to a planet (or back to the overview with null). */
  const go = useCallback(
    (id: string | null) => {
      if (id === targetRef.current) return;
      targetRef.current = id;
      window.clearTimeout(timerRef.current);
      const now = performance.now();
      if (id) {
        setFocusId(id);
        setPoiIndex(0);
        setHoveredId(null);
        setMarkerHover(false);
        setDetail(null);
        setPhase("entering");
        zoom.play(1, zoomMs, now);
        timerRef.current = window.setTimeout(() => setPhase("planet"), zoom.remaining(now));
      } else {
        setPhase("leaving");
        setMarkerHover(false);
        zoom.play(0, zoomMs, now);
        timerRef.current = window.setTimeout(() => {
          setPhase("overview");
          setFocusId(null);
        }, zoom.remaining(now));
      }
    },
    [zoom, zoomMs],
  );

  /** Change view and record it in the URL, so it can be linked and the back button works. */
  const navigate = useCallback(
    (id: string | null) => {
      if (id === targetRef.current) return;
      const url = id ? `#${id}` : window.location.pathname + window.location.search;
      window.history.pushState(null, "", url);
      go(id);
    },
    [go],
  );

  useEffect(() => {
    const sync = () => go(planetFromHash());
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, [go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented && targetRef.current) navigate(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const openDetail = (d: OverviewDetail) => {
    setDetail(d);
    setDetailState("open");
  };
  const closeDetail = useCallback(() => setDetailState((s) => (s === "open" ? "closing" : s)), []);
  const closedDetail = useCallback(() => setDetail(null), []);

  const toggleSpacecraft = () => {
    setShowSpacecraft((on) => !on);
    setMarkerHover(false);
    if (detail?.kind === "spacecraft") closeDetail();
  };

  const inOverview = phase === "overview";
  const overviewShown = phase === "overview" || phase === "leaving";
  const facing = focus && (phase === "entering" || phase === "planet") ? (focus.body.pois[poiIndex] ?? null) : null;

  return (
    <div
      ref={ref}
      className="plate"
      data-hovering={hoveredId !== null}
      data-phase={phase}
      data-overview={overviewShown ? "shown" : "hidden"}
    >
      {layout && (
        <>
          <div className="plate-canvas">
            <PlateScene
              layout={layout}
              belts={beltShapes}
              hoveredId={hoveredId}
              reducedMotion={reducedMotion}
              zoom={zoom}
              zoomFrame={zoomFrame}
              focusId={focusId}
              facing={facing}
              turnMs={phase === "entering" ? zoomMs : turnMs}
              markerEls={markerEls}
            />
          </div>
          <SpaceBackdrop layout={layout} />
          <PlateHud layout={layout} hoveredId={hoveredId} />
        </>
      )}
      <TopBar
        inOverview={inOverview}
        onOverview={() => navigate(null)}
        showSpacecraft={showSpacecraft}
        onToggleSpacecraft={toggleSpacecraft}
      />
      <main className="plate-main">
        <div className="overview-layer" inert={!inOverview}>
          <div className="plate-title">
            <h1>
              <span>The Solar</span> <span>System</span>
            </h1>
            <p>
              Eight planets and Pluto, arranged for clarity rather than to scale. Distances are in
              astronomical units, the mean distance from Earth to the Sun. Select a planet to travel to it.
            </p>
          </div>
          {layout && (
            <>
              <BeltLabels shapes={beltShapes} onSelect={(item) => openDetail({ kind: "belt", item })} onHover={setMarkerHover} />
              <SpacecraftLayer
                spots={craftSpots}
                width={layout.width}
                shown={showSpacecraft}
                onSelect={(item) => openDetail({ kind: "spacecraft", item })}
                onHover={setMarkerHover}
              />
              <DestinationLabels
                layout={layout}
                hoveredId={hoveredId}
                focusId={focusId}
                onHover={(id) => inOverview && setHoveredId(id)}
                onSelect={navigate}
              />
            </>
          )}
        </div>
        {detail && inOverview && (
          <PoiPanel
            key={detail.item.id}
            poi={detail.item}
            eyebrow={
              detail.kind === "spacecraft"
                ? { mark: String(detail.item.launchYear), label: "Spacecraft" }
                : { label: "Small bodies" }
            }
            state={detailState}
            onClose={closeDetail}
            onClosed={closedDetail}
          />
        )}
        {focus && (
          <PlanetFeature
            key={focus.body.id}
            planet={focus.body}
            order={focus.order}
            phase={phase}
            poiIndex={poiIndex}
            zoomMs={zoomMs}
            markerEls={markerEls}
            onPoiIndex={setPoiIndex}
            onMarkerHover={setMarkerHover}
            onBack={() => navigate(null)}
          />
        )}
      </main>
      <p className="plate-credit">Textures: Solar System Scope, CC BY 4.0. Pluto: NASA/JHUAPL/SwRI.</p>
      <PlateCursor active={hoveredId !== null || markerHover} />
    </div>
  );
}

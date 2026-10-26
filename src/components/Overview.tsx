import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BELTS, DESTINATIONS, SITE, SPACECRAFT, SUN, VIEWABLE, type Belt, type Spacecraft } from "../data/solarSystem";
import { useElementSize } from "../hooks/useElementSize";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { reachFactor } from "../scene/bodyAppearance";
import { computeFeaturePlacement, computePlateLayout, placeBelts, placeSpacecraft } from "../scene/plateLayout";
import { Timeline, TURN_MS, ZOOM_MS, type ZoomFrame } from "../scene/viewTransition";
import { BeltLabels } from "./BeltLabels";
import { DestinationLabels } from "./DestinationLabels";
import { PlanetFeature, type ViewPhase } from "./PlanetFeature";
import { PlateCursor } from "./PlateCursor";
import { PlateHud } from "./PlateHud";
import { PoiPanel, type PanelState } from "./PoiPanel";
import { SceneBoundary, SceneNotice, type SceneFailure } from "./SceneBoundary";
import { SpaceBackdrop } from "./SpaceBackdrop";
import { SpacecraftLayer } from "./SpacecraftLayer";
import { TopBar } from "./TopBar";
import { AmbientSound } from "../lib/ambientSound";
import { pagePath, pageTitle } from "../lib/seo";

// The 3D engine (three.js and friends) is most of the JavaScript; load it in its own
// chunk so the typography and HUD can paint while it downloads.
const PlateScene = lazy(() => import("../scene/PlateScene").then((m) => ({ default: m.PlateScene })));

/** The entrance plays once per browser session. */
const ENTRANCE_KEY = "sse-entrance-played";
/** Full length of the entrance sequence (matches the delays in index.css). */
const ENTRANCE_MS = 2700;
/** Reduced motion: a plain fade instead of the sequence. */
const FADE_MS = 500;
/** If the scene is slow to arrive, start the entrance anyway. */
const ENTRANCE_WAIT_MS = 2500;
/** Reduced motion: the dissolve that replaces the zoom, each way. */
const VEIL_MS = 220;

/** waiting: hidden until the scene is ready; playing: the sequence; fade: reduced motion. */
type Entrance = "waiting" | "playing" | "fade" | "done";

function entrancePlayed() {
  try {
    return sessionStorage.getItem(ENTRANCE_KEY) === "1";
  } catch {
    return false;
  }
}

/** The destination named by `/mars`, or by an older `#mars` link, if it exists. */
function planetFromUrl(): string | null {
  const fromPath = window.location.pathname.slice(import.meta.env.BASE_URL.length).replace(/\/$/, "");
  let fromHash = "";
  try {
    fromHash = decodeURIComponent(window.location.hash.slice(1));
  } catch {
    // A malformed hash such as "#%" names nothing.
  }
  const id = fromPath || fromHash;
  return VIEWABLE.some((p) => p.id === id) ? id : null;
}

/** Turn an older `#mars` link into `/mars`, so the address bar shows the page's real URL. */
function upgradeHashLink() {
  const id = planetFromUrl();
  if (window.location.hash && id) window.history.replaceState(null, "", pagePath(id));
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
  const [initialFocus] = useState(() => {
    upgradeHashLink();
    return planetFromUrl();
  });
  const [focusId, setFocusId] = useState<string | null>(initialFocus);
  const [phase, setPhase] = useState<ViewPhase>(initialFocus ? "planet" : "overview");
  const [poiIndex, setPoiIndex] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [markerHover, setMarkerHover] = useState(false);
  const [showSpacecraft, setShowSpacecraft] = useState(true);
  const [detail, setDetail] = useState<OverviewDetail | null>(null);
  const [sceneFailure, setSceneFailure] = useState<SceneFailure | null>(null);
  const [detailState, setDetailState] = useState<PanelState>("open");
  const [zoom] = useState(() => new Timeline(initialFocus ? 1 : 0));
  const [markerEls] = useState(() => new Map<string, HTMLElement>());
  const [entrance, setEntrance] = useState<Entrance>(() => (initialFocus || entrancePlayed() ? "done" : "waiting"));
  const [veil, setVeil] = useState(false);
  const [sound] = useState(() => new AmbientSound());
  const [soundOn, setSoundOn] = useState(false);
  const targetRef = useRef<string | null>(initialFocus);
  const timerRef = useRef(0);

  const zoomMs = reducedMotion ? 0 : ZOOM_MS;
  const turnMs = reducedMotion ? 0 : TURN_MS;

  const layout = useMemo(
    () => (size.width > 0 ? computePlateLayout(SUN, DESTINATIONS, size.width, size.height) : null),
    [size.width, size.height],
  );
  const beltShapes = useMemo(() => (layout ? placeBelts(layout, BELTS) : []), [layout]);
  // Spacecraft keep clear of the belt labels as well as planets, labels, and the title.
  const craftSpots = useMemo(
    () => (layout ? placeSpacecraft(layout, SPACECRAFT, beltShapes.map((b) => b.labelBox)) : []),
    [layout, beltShapes],
  );

  const focus = !layout || !focusId ? null : focusId === layout.star.body.id ? layout.star : (layout.planets.find((p) => p.body.id === focusId) ?? null);
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
      // Choosing a world sings its song (only when sound is on).
      const body = id ? VIEWABLE.find((b) => b.id === id) : undefined;
      if (body) sound.sing(body);
      const change = () => {
        window.history.pushState(null, "", pagePath(id));
        go(id);
      };
      if (!reducedMotion) return change();
      // Reduced motion: no zoom; dissolve to the abyss, change the view, dissolve back.
      setVeil(true);
      window.setTimeout(() => {
        change();
        setVeil(false);
      }, VEIL_MS);
    },
    [go, reducedMotion, sound],
  );

  // The tab title follows the open world, as the prerendered pages' titles do.
  useEffect(() => {
    document.title = pageTitle(VIEWABLE.find((b) => b.id === focusId));
  }, [focusId]);

  useEffect(() => {
    const sync = () => {
      upgradeHashLink();
      go(planetFromUrl());
    };
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
  useEffect(() => () => sound.dispose(), [sound]);

  // Entrance: start once the scene has drawn (or after a wait), then settle to still.
  const startEntrance = useCallback(() => {
    setEntrance((e) => (e === "waiting" ? (reducedMotion ? "fade" : "playing") : e));
    try {
      sessionStorage.setItem(ENTRANCE_KEY, "1");
    } catch {
      // Storage unavailable (private mode): the entrance simply plays again next time.
    }
  }, [reducedMotion]);
  useEffect(() => {
    if (entrance === "waiting") {
      const t = window.setTimeout(startEntrance, ENTRANCE_WAIT_MS);
      return () => window.clearTimeout(t);
    }
    if (entrance === "playing" || entrance === "fade") {
      const t = window.setTimeout(() => setEntrance("done"), entrance === "fade" ? FADE_MS : ENTRANCE_MS);
      return () => window.clearTimeout(t);
    }
  }, [entrance, startEntrance]);

  const sceneFailed = useCallback(
    (failure: SceneFailure) => {
      setSceneFailure(failure);
      startEntrance(); // nothing left to wait for
    },
    [startEntrance],
  );

  const openDetail = useCallback((d: OverviewDetail) => {
    setDetail(d);
    setDetailState("open");
  }, []);
  const openBelt = useCallback((item: Belt) => openDetail({ kind: "belt", item }), [openDetail]);
  const openCraft = useCallback((item: Spacecraft) => openDetail({ kind: "spacecraft", item }), [openDetail]);
  const closeDetail = useCallback(() => setDetailState((s) => (s === "open" ? "closing" : s)), []);
  const closedDetail = useCallback(() => setDetail(null), []);

  const detailKind = detail?.kind;
  const toggleSpacecraft = useCallback(() => {
    setShowSpacecraft((on) => !on);
    setMarkerHover(false);
    if (detailKind === "spacecraft") closeDetail();
  }, [detailKind, closeDetail]);

  // Called from the click itself: browsers only allow audio to start from a user gesture.
  const toggleSound = useCallback(() => {
    if (soundOn) sound.disable();
    else sound.enable();
    setSoundOn(!soundOn);
  }, [sound, soundOn]);

  const toOverview = useCallback(() => navigate(null), [navigate]);

  const inOverview = phase === "overview";
  const hoverPlanet = useCallback(
    (id: string | null) => {
      if (phase === "overview") setHoveredId(id);
    },
    [phase],
  );
  const overviewShown = phase === "overview" || phase === "leaving";
  const facing = focus && (phase === "entering" || phase === "planet") ? (focus.body.pois[poiIndex] ?? null) : null;

  return (
    <div
      ref={ref}
      className="plate"
      data-hovering={hoveredId !== null}
      data-phase={phase}
      data-overview={overviewShown ? "shown" : "hidden"}
      data-entrance={entrance}
      data-focus={focusId ?? undefined}
    >
      {layout && (
        <>
          <SceneBoundary onError={sceneFailed}>
            <div className="plate-canvas">
              <Suspense fallback={null}>
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
                  onReady={startEntrance}
                />
              </Suspense>
            </div>
          </SceneBoundary>
          <SpaceBackdrop layout={layout} />
          <PlateHud layout={layout} hoveredId={hoveredId} />
        </>
      )}
      <TopBar
        inOverview={inOverview}
        onOverview={toOverview}
        showSpacecraft={showSpacecraft}
        onToggleSpacecraft={toggleSpacecraft}
        soundOn={soundOn}
        onToggleSound={toggleSound}
      />
      <main className="plate-main">
        <div className="overview-layer" inert={!inOverview}>
          <div className="plate-title">
            <h1>
              {/* Two spans, so the title can break onto two lines. */}
              <span>{SITE.title.split(" ").slice(0, -1).join(" ")}</span> <span>{SITE.title.split(" ").at(-1)}</span>
            </h1>
            <p>{SITE.intro}</p>
            {sceneFailure && <SceneNotice failure={sceneFailure} />}
          </div>
          {layout && (
            <>
              <BeltLabels shapes={beltShapes} onSelect={openBelt} onHover={setMarkerHover} />
              <SpacecraftLayer
                spots={craftSpots}
                width={layout.width}
                shown={showSpacecraft}
                onSelect={openCraft}
                onHover={setMarkerHover}
              />
              <DestinationLabels
                layout={layout}
                hoveredId={hoveredId}
                focusId={focusId}
                onHover={hoverPlanet}
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
            onBack={toOverview}
          />
        )}
      </main>
      <p className="plate-credit">Textures: Solar System Scope, CC BY 4.0. Pluto: NASA/JHUAPL/SwRI.</p>
      <div className="view-veil" data-on={veil} aria-hidden="true" />
      <PlateCursor active={hoveredId !== null || markerHover} />
    </div>
  );
}

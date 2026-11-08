import { lazy, Suspense, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { plateById } from "../data/plates";
import type { Belt, Spacecraft } from "../data/solarSystem";
import { useElementSize } from "../hooks/useElementSize";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { reachFactor } from "../scene/bodyAppearance";
import { computeFeaturePlacement } from "../scene/layout/screen";
import { composePlate } from "../scene/layout/plates";
import { placeBelts, placeSpacecraft } from "../scene/layout/solarPlate";
import { Timeline, TURN_MS, ZOOM_MS, type ZoomFrame } from "../scene/viewTransition";
import { BeltLabels } from "./BeltLabels";
import { DestinationLabels } from "./DestinationLabels";
import { PlanetFeature } from "./PlanetFeature";
import { PlateCursor } from "./PlateCursor";
import { PlateHud } from "./PlateHud";
import { PoiPanel, type PanelState } from "./PoiPanel";
import { SceneBoundary, SceneNotice, type SceneFailure } from "./SceneBoundary";
import { SpaceBackdrop } from "./SpaceBackdrop";
import { SpacecraftLayer } from "./SpacecraftLayer";
import { TopBar } from "./TopBar";
import { AmbientSound } from "../lib/ambientSound";
import { pagePath, pageTitle } from "../lib/seo";
import { HOME, routeFromLocation, type Route } from "../lib/routes";
import { crossesPlates, initialNav, navReducer, samePage } from "../state/navigation";

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
/** Between plates (a change of scale): a slower dissolve, each way. Matches --dur in CSS. */
const SCALE_VEIL_MS = 380;

/** waiting: hidden until the scene is ready; playing: the sequence; fade: reduced motion. */
type Entrance = "waiting" | "playing" | "fade" | "done";

function entrancePlayed() {
  try {
    return sessionStorage.getItem(ENTRANCE_KEY) === "1";
  } catch {
    return false;
  }
}

/** The page the address bar names. */
function routeFromUrl(): Route {
  return routeFromLocation(window.location.pathname, window.location.hash, import.meta.env.BASE_URL);
}

/** Turn an older `#mars` link into `/mars`, so the address bar shows the page's real URL. */
function upgradeHashLink() {
  const route = routeFromUrl();
  if (window.location.hash && route.body) window.history.replaceState(null, "", pagePath(route));
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
  const [initialRoute] = useState(() => {
    upgradeHashLink();
    return routeFromUrl();
  });
  const initialFocus = initialRoute.body !== null;
  const [nav, dispatch] = useReducer(navReducer, initialRoute, initialNav);
  const { phase, poiIndex } = nav;
  const plate = nav.shown.plate;
  const focusId = nav.shown.body?.id ?? null;
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
  /** quick: the reduced-motion stand-in for a zoom; scale: a change of plate. */
  const [veilKind, setVeilKind] = useState<"quick" | "scale">("quick");
  const [sound] = useState(() => new AmbientSound());
  const [soundOn, setSoundOn] = useState(false);
  const targetRef = useRef<Route>(initialRoute);
  const timerRef = useRef(0);

  const zoomMs = reducedMotion ? 0 : ZOOM_MS;
  const turnMs = reducedMotion ? 0 : TURN_MS;

  const layout = useMemo(() => (size.width > 0 ? composePlate(plate, size.width, size.height) : null), [plate, size.width, size.height]);
  const beltShapes = useMemo(() => (layout && plate.belts ? placeBelts(layout, plate.belts) : []), [layout, plate]);
  // Spacecraft keep clear of the belt labels as well as planets, labels, and the title.
  const craftSpots = useMemo(
    () => (layout && plate.spacecraft ? placeSpacecraft(layout, plate.spacecraft, beltShapes.map((b) => b.labelBox)) : []),
    [layout, plate, beltShapes],
  );

  const focus = !layout || !focusId ? null : focusId === layout.star.body.id ? layout.star : (layout.planets.find((p) => p.body.id === focusId) ?? null);
  const zoomFrame = useMemo<ZoomFrame | null>(() => {
    if (!layout || !focus) return null;
    return {
      from: { x: focus.x, y: focus.y, r: focus.r },
      to: computeFeaturePlacement(layout.width, layout.height, reachFactor(focus.body.id)),
    };
  }, [layout, focus]);

  /** Run the transition to a page: into a body's view, or back out to its plate. */
  const go = useCallback(
    (to: Route) => {
      if (samePage(to, targetRef.current)) return;
      // A change of scale arrives at rest (a dissolve covers it); a body zooms in or out.
      const crossing = crossesPlates(targetRef.current, to);
      targetRef.current = to;
      window.clearTimeout(timerRef.current);
      const now = performance.now();
      dispatch({ type: "go", to });
      setMarkerHover(false);
      if (to.body || crossing) {
        setHoveredId(null);
        setDetail(null);
      }
      zoom.play(to.body ? 1 : 0, crossing ? 0 : zoomMs, now);
      timerRef.current = window.setTimeout(() => dispatch({ type: "settle" }), zoom.remaining(now));
    },
    [zoom, zoomMs],
  );

  /** Fade to the abyss, run `change` under cover, and fade back. */
  const dissolve = useCallback((change: () => void, kind: "quick" | "scale") => {
    const ms = kind === "scale" ? SCALE_VEIL_MS : VEIL_MS;
    setVeilKind(kind);
    setVeil(true);
    window.setTimeout(() => {
      change();
      setVeil(false);
    }, ms);
  }, []);

  /** Change view and record it in the URL, so it can be linked and the back button works. */
  const navigate = useCallback(
    (to: Route) => {
      if (samePage(to, targetRef.current)) return;
      // Choosing a world sings its song (only when sound is on).
      if (to.body) sound.sing(to.body);
      const change = () => {
        window.history.pushState(null, "", pagePath(to));
        go(to);
      };
      const crossing = crossesPlates(targetRef.current, to);
      if (!reducedMotion && !crossing) return change();
      // A change of scale, or any change with reduced motion: dissolve to the abyss,
      // change the view, dissolve back.
      dissolve(change, crossing ? "scale" : "quick");
    },
    [go, reducedMotion, sound, dissolve],
  );

  // The tab title follows the open world, as the prerendered pages' titles do.
  useEffect(() => {
    document.title = pageTitle(nav.shown);
  }, [nav.shown]);

  useEffect(() => {
    const sync = () => {
      upgradeHashLink();
      const to = routeFromUrl();
      if (crossesPlates(targetRef.current, to)) dissolve(() => go(to), "scale");
      else go(to);
    };
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, [go, dissolve]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { plate, body } = targetRef.current;
      if (e.key === "Escape" && !e.defaultPrevented && body) navigate({ plate, body: null });
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

  const toOverview = useCallback(() => navigate({ plate: targetRef.current.plate, body: null }), [navigate]);
  const toHome = useCallback(() => navigate(HOME), [navigate]);
  /** One scale out: the plate that holds this one. */
  const outer = plate.outward ? plateById(plate.outward) : null;
  const toOuter = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (outer) navigate({ plate: outer, body: null });
    },
    [navigate, outer],
  );
  const selectBody = useCallback(
    (id: string) => {
      // The point of light that leads one scale in (Sol, on the neighbourhood plate).
      if (plate.inward?.body.id === id) return navigate({ plate: plateById(plate.inward.plate), body: null });
      const body = plate.bodies.find((b) => b.id === id);
      if (body) navigate({ plate, body });
    },
    [navigate, plate],
  );
  const setPoiIndex = useCallback((index: number) => dispatch({ type: "poi", index }), []);

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
      data-plate={plate.id}
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
        overviewPath={pagePath({ plate, body: null })}
        onOverview={toOverview}
        onHome={toHome}
        hasSpacecraft={craftSpots.length > 0}
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
              <span>{plate.title.split(" ").slice(0, -1).join(" ")}</span> <span>{plate.title.split(" ").at(-1)}</span>
            </h1>
            <p>
              <span className="plate-title__intro">{plate.intro}</span>
              {outer && (
                <>
                  {" "}
                  <a className="plate-beyond" href={pagePath({ plate: outer, body: null })} onClick={toOuter} aria-label={`And beyond: ${outer.title}`}>
                    <span className="plate-beyond__line">and beyond</span>
                    <span className="plate-beyond__name">{outer.title}</span>
                  </a>
                </>
              )}
            </p>
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
                onSelect={selectBody}
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
            backLabel={plate.backLabel}
          />
        )}
      </main>
      <p className="plate-credit">{plate.credit}</p>
      <div className="view-veil" data-on={veil} data-kind={veilKind} aria-hidden="true" />
      <PlateCursor active={hoveredId !== null || markerHover} />
    </div>
  );
}

import { lazy, Suspense, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { plateById, type Milestone } from "../data/plates";
import type { Belt, Spacecraft } from "../data/solarSystem";
import { useElementSize } from "../hooks/useElementSize";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { reachFactor } from "../scene/bodyAppearance";
import { computeFeaturePlacement } from "../scene/layout/screen";
import { composePlate } from "../scene/layout/plates";
import { placeBelts, placeSpacecraft } from "../scene/layout/solarPlate";
import { Timeline, TURN_MS, ZOOM_MS, type ZoomFrame } from "../scene/viewTransition";
import { IDENTITY_STAGE, type StageRef, type VoyageEnds } from "../scene/voyage";
import { ScaleVoyage } from "./ScaleVoyage";
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

/** A voyage between scales in progress: which way, where to, and what it passes. */
interface Voyage {
  /** Each voyage gets its own overlay, even one that starts the moment another ends. */
  id: number;
  direction: "out" | "in";
  /** The plate element, whose CSS variables carry the stage transform. */
  root: HTMLElement;
  to: Route;
  ends: VoyageEnds;
  milestones: Milestone[];
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
  const [voyage, setVoyage] = useState<Voyage | null>(null);
  const voyageRef = useRef<Voyage | null>(null);
  /** The latest followUrl, for the voyage's end (declared before it). */
  const followUrlRef = useRef<(() => void) | null>(null);
  const [stage] = useState<StageRef>(() => ({ current: IDENTITY_STAGE }));
  /** Whether the shown page is a plate's overview at rest (read from event handlers). */
  const restingRef = useRef(phase === "overview");
  useEffect(() => {
    restingRef.current = phase === "overview";
  }, [phase]);

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

  /**
   * The voyage for a move between neighbouring scales, from one plate's overview at rest to
   * the other's; null for any other move (those keep the dissolve), or with reduced motion.
   */
  const voyageFor = useCallback(
    (from: Route, to: Route): Voyage | null => {
      const root = ref.current;
      if (reducedMotion || from.body || to.body || !restingRef.current || size.width === 0 || !root) return null;
      const out = from.plate.outward === to.plate.id;
      if (!out && to.plate.outward !== from.plate.id) return null;
      const [inner, outer] = out ? [from.plate, to.plate] : [to.plate, from.plate];
      const a = composePlate(inner, size.width, size.height);
      const b = composePlate(outer, size.width, size.height);
      return {
        id: performance.now(),
        direction: out ? "out" : "in",
        root,
        to,
        ends: { inner: { x: a.sun.x, y: a.sun.y, auPerPx: a.auPerPx }, outer: { x: b.sun.x, y: b.sun.y, auPerPx: b.auPerPx } },
        milestones: outer.approach ?? [],
      };
    },
    [reducedMotion, size.width, size.height, ref],
  );

  const startVoyage = useCallback((v: Voyage) => {
    voyageRef.current = v;
    setVoyage(v);
    setHoveredId(null);
    setDetail(null);
  }, []);
  const voyageSwap = useCallback(() => {
    if (voyageRef.current) go(voyageRef.current.to);
  }, [go]);
  const voyageDone = useCallback(() => {
    voyageRef.current = null;
    setVoyage(null);
    // If the address bar moved on during the voyage (the back button), follow it now.
    if (!samePage(routeFromUrl(), targetRef.current)) window.setTimeout(() => followUrlRef.current?.(), 0);
  }, []);

  /** Change view and record it in the URL, so it can be linked and the back button works. */
  const navigate = useCallback(
    (to: Route) => {
      if (voyageRef.current || samePage(to, targetRef.current)) return;
      // Choosing a world sings its song (only when sound is on).
      if (to.body) sound.sing(to.body);
      const change = () => {
        window.history.pushState(null, "", pagePath(to));
        go(to);
      };
      const crossing = crossesPlates(targetRef.current, to);
      const v = crossing ? voyageFor(targetRef.current, to) : null;
      if (v) {
        window.history.pushState(null, "", pagePath(to));
        return startVoyage(v);
      }
      if (!reducedMotion && !crossing) return change();
      // A change of scale, or any change with reduced motion: dissolve to the abyss,
      // change the view, dissolve back.
      dissolve(change, crossing ? "scale" : "quick");
    },
    [go, reducedMotion, sound, dissolve, voyageFor, startVoyage],
  );

  // The tab title follows the open world, as the prerendered pages' titles do.
  useEffect(() => {
    document.title = pageTitle(nav.shown);
  }, [nav.shown]);

  /** Go wherever the address bar says (after back/forward, or once a voyage ends). */
  const followUrl = useCallback(() => {
    // Mid-voyage the move waits: when the voyage ends it checks the address bar again.
    if (voyageRef.current) return;
    const to = routeFromUrl();
    const crossing = crossesPlates(targetRef.current, to);
    const v = crossing ? voyageFor(targetRef.current, to) : null;
    if (v) startVoyage(v);
    else if (crossing) dissolve(() => go(to), "scale");
    else go(to);
  }, [go, dissolve, voyageFor, startVoyage]);
  useEffect(() => {
    followUrlRef.current = followUrl;
  }, [followUrl]);

  useEffect(() => {
    const sync = () => {
      upgradeHashLink();
      followUrl();
    };
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, [followUrl]);

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
      data-voyage={voyage?.direction}
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
                  stage={stage}
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
            // The labels move with the plate on the voyage between scales; the title doesn't.
            <div className="plate-stage">
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
            </div>
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
      {voyage && (
        <ScaleVoyage
          key={voyage.id}
          direction={voyage.direction}
          ends={voyage.ends}
          milestones={voyage.milestones}
          width={size.width}
          height={size.height}
          stage={stage}
          root={voyage.root}
          onSwap={voyageSwap}
          onDone={voyageDone}
        />
      )}
      <div className="view-veil" data-on={veil} data-kind={veilKind} aria-hidden="true" />
      <PlateCursor active={hoveredId !== null || markerHover} />
    </div>
  );
}

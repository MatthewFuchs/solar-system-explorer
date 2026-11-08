import { Canvas, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Suspense, useEffect } from "react";
import { AdditiveBlending, BufferGeometry, Mesh, PlaneGeometry, Points, Scene, ShaderMaterial } from "three";
import type { POI } from "../data/solarSystem";
import { BeltField } from "./BeltField";
import { galaxyFragmentShader, galaxyGlowFragmentShader, galaxyGlowVertexShader, galaxyVertexShader, GalaxyField } from "./GalaxyField";
import { deepSkyShader } from "./shaders";
import { PALETTE } from "../lib/palette";
import { appearanceFor } from "./bodyAppearance";
import type { BeltShape, PlateLayout } from "./layout/solarPlate";
import { Orbiters } from "./Orbiters";
import { PlanetBody } from "./PlanetBody";
import { Starfield } from "./Starfield";
import type { Timeline, ZoomFrame } from "./viewTransition";
import type { StageRef } from "./voyage";

interface PlateSceneProps {
  layout: PlateLayout;
  belts: BeltShape[];
  hoveredId: string | null;
  reducedMotion: boolean;
  zoom: Timeline;
  zoomFrame: ZoomFrame | null;
  focusId: string | null;
  facing: POI | null;
  turnMs: number;
  markerEls: Map<string, HTMLElement>;
  /** The voyage between scales: scales and fades the plate's bodies and belts. */
  stage?: StageRef;
  /** Called once every texture has loaded and the first full frame has been drawn. */
  onReady?: () => void;
}

/**
 * The 3D layer: stars, the Sun, and lit planets. A fixed orthographic camera maps
 * one world unit to one CSS pixel, so bodies line up with the SVG and HTML layers.
 * Autonomous motion is limited to each planet's slow spin; the zoom into a planet
 * and turns toward its points of interest answer the user.
 */
export function PlateScene({
  layout,
  belts,
  hoveredId,
  reducedMotion,
  zoom,
  zoomFrame,
  focusId,
  facing,
  turnMs,
  markerEls,
  stage,
  onReady,
}: PlateSceneProps) {
  const { width, height, sun, star, planets } = layout;
  const sunFocus = focusId === star.body.id;
  const focusPlanet = planets.find((p) => p.body.id === focusId);

  return (
    <Canvas
      orthographic
      // Planets spin continuously; with reduced motion nothing moves, so render only on change.
      frameloop={reducedMotion ? "demand" : "always"}
      // 1.5x keeps edges crisp on retina screens at roughly half the fill cost of 2x.
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 1000], zoom: 1, near: 1, far: 3000 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      style={{ pointerEvents: "none" }}
      // The scene unmounts only when it fails (SceneBoundary) or the page goes away. R3F then
      // forces a WebGL context loss, which blocks the page for ~25s under software rendering
      // (SwiftShader on Linux, machines without a GPU), so the Reload notice froze with it.
      // The browser frees the context with its canvas anyway.
      onCreated={({ gl }) => {
        gl.forceContextLoss = () => {};
      }}
    >
      <color attach="background" args={[PALETTE.abyss]} />
      <ShaderWarmup />
      <Starfield width={width} height={height} />
      <BeltField belts={belts} width={width} height={height} zoom={zoom} zoomFrame={zoomFrame} stage={stage} />
      {layout.galaxy && <GalaxyField galaxy={layout.galaxy} width={width} height={height} zoom={zoom} zoomFrame={zoomFrame} stage={stage} />}
      <Suspense fallback={null}>
        {/* The Sun: the same body component in star mode, so it can be hovered and opened. */}
        <PlanetBody
          star
          base={sun}
          sun={sun}
          appearance={appearanceFor(star.body.id)}
          active={hoveredId === star.body.id}
          dimmed={hoveredId !== null && hoveredId !== star.body.id}
          reducedMotion={reducedMotion}
          zoom={zoom}
          zoomFrame={zoomFrame}
          isFocus={sunFocus}
          facing={sunFocus ? facing : null}
          turnMs={turnMs}
          pois={sunFocus ? star.body.pois : undefined}
          markerEls={sunFocus ? markerEls : undefined}
          stage={stage}
        />
        {planets.map((p) => {
          const isFocus = focusId === p.body.id;
          return (
            <PlanetBody
              key={p.body.id}
              star={p.body.kind === "star"}
              base={{ x: p.x, y: p.y, r: p.r }}
              sun={sun}
              appearance={appearanceFor(p.body.id)}
              active={hoveredId === p.body.id}
              dimmed={hoveredId !== null && hoveredId !== p.body.id}
              reducedMotion={reducedMotion}
              zoom={zoom}
              zoomFrame={zoomFrame}
              isFocus={isFocus}
              facing={isFocus ? facing : null}
              turnMs={turnMs}
              pois={isFocus ? p.body.pois : undefined}
              markerEls={isFocus ? markerEls : undefined}
              stage={stage}
            />
          );
        })}
        <SceneReady onReady={onReady} />
      </Suspense>
      {/* The open planet's moons; they load on their own, so they never hold up the scene. */}
      {focusPlanet && (
        <Orbiters
          key={focusPlanet.body.id}
          base={{ x: focusPlanet.x, y: focusPlanet.y, r: focusPlanet.r }}
          sun={sun}
          pois={focusPlanet.body.pois}
          zoom={zoom}
          zoomFrame={zoomFrame}
          selectedId={facing?.id ?? null}
        />
      )}
      {/* Threshold 1 means only the over-bright Sun blooms. */}
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.4} intensity={2.4} radius={0.88} />
      </EffectComposer>
    </Canvas>
  );
}

/**
 * Rendered inside the Suspense boundary, so its effect runs only once the Sun and
 * planet textures have resolved; two frames later the scene is on screen.
 */
function SceneReady({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    if (!onReady) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(onReady);
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [onReady]);
  return null;
}

/**
 * Compiles the shaders another plate will need (deep-sky objects, the galaxy's stipple) while
 * the scene starts, so the voyage between scales doesn't stall when that plate swaps in. The
 * materials are kept, so their compiled programs stay cached.
 */
const warmMaterials = [
  new ShaderMaterial({ ...deepSkyShader, transparent: true, premultipliedAlpha: true, depthWrite: false }),
  new ShaderMaterial({ vertexShader: galaxyGlowVertexShader, fragmentShader: galaxyGlowFragmentShader, transparent: true, depthWrite: false, blending: AdditiveBlending }),
  new ShaderMaterial({ vertexShader: galaxyVertexShader, fragmentShader: galaxyFragmentShader, transparent: true, depthWrite: false, blending: AdditiveBlending }),
];

function ShaderWarmup() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const scene = new Scene();
    const plane = new PlaneGeometry(1, 1);
    const dots = new BufferGeometry();
    scene.add(new Mesh(plane, warmMaterials[0]), new Mesh(plane, warmMaterials[1]), new Points(dots, warmMaterials[2]));
    gl.compile(scene, camera);
    plane.dispose();
    dots.dispose();
  }, [gl, camera]);
  return null;
}

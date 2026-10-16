import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Suspense } from "react";
import type { POI } from "../data/solarSystem";
import { BeltField } from "./BeltField";
import { PALETTE } from "../lib/palette";
import { appearanceFor } from "./bodyAppearance";
import type { BeltShape, PlateLayout } from "./plateLayout";
import { PlanetBody } from "./PlanetBody";
import { Starfield } from "./Starfield";
import { SunBody } from "./SunBody";
import type { Timeline, ZoomFrame } from "./viewTransition";

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
}: PlateSceneProps) {
  const { width, height, sun, planets } = layout;

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
    >
      <color attach="background" args={[PALETTE.abyss]} />
      <Starfield width={width} height={height} />
      <BeltField belts={belts} width={width} height={height} zoom={zoom} zoomFrame={zoomFrame} />
      <Suspense fallback={null}>
        <SunBody base={sun} zoom={zoom} zoomFrame={zoomFrame} />
        {planets.map((p) => {
          const isFocus = focusId === p.body.id;
          return (
            <PlanetBody
              key={p.body.id}
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
            />
          );
        })}
      </Suspense>
      {/* Threshold 1 means only the over-bright Sun blooms. */}
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.4} intensity={2.4} radius={0.88} />
      </EffectComposer>
    </Canvas>
  );
}

import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Suspense } from "react";
import { PALETTE } from "../lib/palette";
import { appearanceFor } from "./bodyAppearance";
import type { PlateLayout } from "./plateLayout";
import { PlanetBody } from "./PlanetBody";
import { Starfield } from "./Starfield";
import { SunBody } from "./SunBody";

interface PlateSceneProps {
  layout: PlateLayout;
  hoveredId: string | null;
  reducedMotion: boolean;
}

/**
 * The 3D layer: stars, the Sun, and lit planets. A fixed orthographic camera maps
 * one world unit to one CSS pixel, so bodies line up with the SVG and HTML HUD.
 * Nothing animates on its own; the canvas only renders when something changes.
 */
export function PlateScene({ layout, hoveredId, reducedMotion }: PlateSceneProps) {
  const { width, height, sun, planets } = layout;

  return (
    <Canvas
      orthographic
      frameloop="demand"
      // 1.5x keeps edges crisp on retina screens at roughly half the fill cost of 2x.
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 1000], zoom: 1, near: 1, far: 3000 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      style={{ pointerEvents: "none" }}
    >
      <color attach="background" args={[PALETTE.abyss]} />
      <Starfield width={width} height={height} />
      <Suspense fallback={null}>
        <SunBody x={sun.x} y={sun.y} r={sun.r} />
        {planets.map((p) => (
          <PlanetBody
            key={p.body.id}
            x={p.x}
            y={p.y}
            r={p.r}
            sun={sun}
            appearance={appearanceFor(p.body.id)}
            active={hoveredId === p.body.id}
            dimmed={hoveredId !== null && hoveredId !== p.body.id}
            reducedMotion={reducedMotion}
          />
        ))}
      </Suspense>
      {/* Threshold 1 means only the over-bright Sun blooms. */}
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.4} intensity={2.4} radius={0.88} />
      </EffectComposer>
    </Canvas>
  );
}

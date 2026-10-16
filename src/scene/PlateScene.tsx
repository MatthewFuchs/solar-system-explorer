import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import { hexToRgb, muteTone } from "../lib/color";
import { PALETTE } from "../lib/palette";
import type { PlateLayout } from "./plateLayout";
import { PlateSphere } from "./PlateSphere";

interface PlateSceneProps {
  layout: PlateLayout;
  hoveredId: string | null;
  reducedMotion: boolean;
}

/**
 * The 3D layer of the plate: only the shaded spheres. A fixed orthographic camera
 * maps one world unit to one CSS pixel, so spheres line up with the SVG and HTML layers.
 */
export function PlateScene({ layout, hoveredId, reducedMotion }: PlateSceneProps) {
  const ink = useMemo(() => hexToRgb(PALETTE.inkDeep), []);
  const sunColor = useMemo(() => hexToRgb(PALETTE.giltLight), []);
  const sunInk = useMemo(() => hexToRgb(PALETTE.giltShadow), []);
  const { sun, planets } = layout;

  return (
    <Canvas
      orthographic
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ position: [0, 0, 1000], zoom: 1, near: 1, far: 3000 }}
      gl={{ alpha: true, antialias: true }}
      style={{ pointerEvents: "none" }}
    >
      {/* Lit from the front so the limb darkens into halftone. */}
      <PlateSphere
        x={sun.x}
        y={sun.y}
        radius={sun.r}
        color={sunColor}
        ink={sunInk}
        lightDir={[0, 0, 1]}
        cell={6}
        reducedMotion={reducedMotion}
      />
      {planets.map((p) => {
        // Each planet is lit from the direction of the Sun.
        const dx = sun.x - p.x;
        const dy = p.y - sun.y;
        const len = Math.hypot(dx, dy) || 1;
        return (
          <PlateSphere
            key={p.body.id}
            x={p.x}
            y={p.y}
            radius={p.r}
            color={muteTone(p.body.color, PALETTE.bone)}
            ink={ink}
            lightDir={[(dx / len) * 0.8, (dy / len) * 0.8, 0.6]}
            cell={3.4}
            active={hoveredId === p.body.id}
            dimmed={hoveredId !== null && hoveredId !== p.body.id}
            reducedMotion={reducedMotion}
          />
        );
      })}
    </Canvas>
  );
}

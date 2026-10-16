import { memo, type CSSProperties } from "react";
import type { PlateLayout } from "../scene/plateLayout";

interface SpaceBackdropProps {
  layout: PlateLayout;
}

/**
 * Light layers composited over the 3D canvas with screen blending: faint nebula
 * haze, the Sun's glow across the scene, and a vignette that keeps the edges in shadow. Static.
 */
export const SpaceBackdrop = memo(function SpaceBackdrop({ layout }: SpaceBackdropProps) {
  const { sun } = layout;
  const at = `${sun.x}px ${sun.y}px`;
  const glow: CSSProperties = {
    background: [
      `radial-gradient(circle at ${at}, rgba(255, 196, 128, 0.38) 0, rgba(240, 150, 80, 0.17) ${sun.r * 1.35}px, rgba(200, 110, 70, 0.06) ${sun.r * 3}px, transparent ${sun.r * 5.6}px)`,
      `radial-gradient(ellipse ${layout.width * 1.1}px ${layout.height * 0.9}px at ${at}, rgba(220, 140, 90, 0.08), transparent 70%)`,
    ].join(", "),
  };

  return (
    <>
      <div className="space-haze" aria-hidden="true" />
      <div className="space-sunglow" style={glow} aria-hidden="true" />
      <div className="space-vignette" aria-hidden="true" />
    </>
  );
});

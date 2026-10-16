import type { CSSProperties } from "react";
import type { PlateLayout } from "../scene/plateLayout";

interface SpaceBackdropProps {
  layout: PlateLayout;
}

/**
 * Light layers composited over the 3D canvas with screen blending: faint nebula
 * haze and the Sun's volumetric glow spreading across the scene. Static.
 */
export function SpaceBackdrop({ layout }: SpaceBackdropProps) {
  const { sun } = layout;
  const at = `${sun.x}px ${sun.y}px`;
  const glow: CSSProperties = {
    background: [
      `radial-gradient(circle at ${at}, rgba(255, 206, 140, 0.42) 0, rgba(255, 170, 84, 0.2) ${sun.r * 1.35}px, rgba(255, 140, 60, 0.07) ${sun.r * 3}px, transparent ${sun.r * 5.6}px)`,
      `radial-gradient(ellipse ${layout.width * 1.1}px ${layout.height * 0.9}px at ${at}, rgba(255, 170, 90, 0.1), transparent 70%)`,
    ].join(", "),
  };

  return (
    <>
      <div className="space-haze" aria-hidden="true" />
      <div className="space-sunglow" style={glow} aria-hidden="true" />
    </>
  );
}

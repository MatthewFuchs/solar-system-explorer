import { useMemo, useState } from "react";
import { PLANETS } from "../data/solarSystem";
import { useElementSize } from "../hooks/useElementSize";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { computePlateLayout } from "../scene/plateLayout";
import { PlateScene } from "../scene/PlateScene";
import { PlateArcs } from "./PlateArcs";
import { PlateCursor } from "./PlateCursor";
import { PlateLabels } from "./PlateLabels";

/** The solar system overview, composed as a fixed astronomical plate. */
export function Overview() {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const layout = useMemo(
    () => (size.width > 0 ? computePlateLayout(PLANETS, size.width, size.height) : null),
    [size.width, size.height],
  );

  return (
    <main ref={ref} className="plate" data-hovering={hoveredId !== null}>
      {layout && (
        <>
          <PlateArcs layout={layout} hoveredId={hoveredId} />
          <div className="plate-canvas">
            <PlateScene layout={layout} hoveredId={hoveredId} reducedMotion={reducedMotion} />
          </div>
          <header className="plate-title">
            <h1>The Solar System</h1>
            <p>
              Eight planets, placed for the eye rather than to scale. Distances are in astronomical
              units, one AU being the mean distance from Earth to the Sun.
            </p>
          </header>
          <PlateLabels layout={layout} hoveredId={hoveredId} onHover={setHoveredId} />
        </>
      )}
      <div className="plate-frame" aria-hidden="true" />
      <div className="plate-grain" aria-hidden="true" />
      <PlateCursor active={hoveredId !== null} />
    </main>
  );
}

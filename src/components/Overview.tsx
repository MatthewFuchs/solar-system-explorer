import { useMemo, useState } from "react";
import { PLANETS } from "../data/solarSystem";
import { useElementSize } from "../hooks/useElementSize";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { computePlateLayout } from "../scene/plateLayout";
import { PlateScene } from "../scene/PlateScene";
import { DestinationLabels } from "./DestinationLabels";
import { PlateCursor } from "./PlateCursor";
import { PlateHud } from "./PlateHud";
import { SpaceBackdrop } from "./SpaceBackdrop";
import { TopBar } from "./TopBar";

/** The solar system overview: a fixed destination map floating over deep space. */
export function Overview() {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const layout = useMemo(
    () => (size.width > 0 ? computePlateLayout(PLANETS, size.width, size.height) : null),
    [size.width, size.height],
  );

  return (
    <div ref={ref} className="plate" data-hovering={hoveredId !== null}>
      {layout && (
        <>
          <div className="plate-canvas">
            <PlateScene layout={layout} hoveredId={hoveredId} reducedMotion={reducedMotion} />
          </div>
          <SpaceBackdrop layout={layout} />
          <PlateHud layout={layout} hoveredId={hoveredId} />
        </>
      )}
      <TopBar />
      <main className="plate-main">
        <div className="plate-title">
          <h1>
            <span>The Solar</span> <span>System</span>
          </h1>
          <p>
            Eight planets, arranged for clarity rather than to scale. Distances are in AU, the mean
            distance from Earth to the Sun. Hover or focus a planet to inspect it.
          </p>
        </div>
        {layout && <DestinationLabels layout={layout} hoveredId={hoveredId} onHover={setHoveredId} />}
      </main>
      <div className="hud-corners" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <p className="plate-credit">Textures: Solar System Scope, CC BY 4.0</p>
      <PlateCursor active={hoveredId !== null} />
    </div>
  );
}

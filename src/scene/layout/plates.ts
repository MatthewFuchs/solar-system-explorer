// Each plate's composition. The solar system is the house diagonal (solarPlate.ts); the
// neighbourhood and the Milky Way are true-scale charts (neighbourhoodPlate.ts,
// milkyWayPlate.ts). All share label placement (labels.ts) and return the same layout
// shape, so every layer above draws any of them.
import type { Plate } from "../../data/plates";
import type { CelestialBody } from "../../data/solarSystem";
import { computeMilkyWayLayout } from "./milkyWayPlate";
import { computeNeighbourhoodLayout } from "./neighbourhoodPlate";
import { computePlateLayout, type PlateLayout } from "./solarPlate";

type Composer = (
  centre: CelestialBody,
  bodies: CelestialBody[],
  width: number,
  height: number,
  title: { title: string; intro: string },
) => PlateLayout;

const COMPOSERS: Record<string, Composer> = {
  // The solar plate's layout is locked: it keeps its fixed title area, so it ignores the title.
  solar: (centre, bodies, width, height) => computePlateLayout(centre, bodies, width, height),
  neighbourhood: computeNeighbourhoodLayout,
  "milky-way": computeMilkyWayLayout,
};

/** A plate's layout on a screen of this size. */
export function composePlate(plate: Plate, width: number, height: number): PlateLayout {
  const compose = COMPOSERS[plate.id];
  if (!compose) throw new Error(`No composition for plate "${plate.id}"`);
  return compose(
    plate.centre,
    plate.bodies.filter((b) => b !== plate.centre),
    width,
    height,
    plate,
  );
}

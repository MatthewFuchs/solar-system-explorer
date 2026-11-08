// Each plate's composition. Every plate uses the same placement and label logic
// (computePlateLayout); what differs is its shape: where its centre sits, and how its
// bodies fall along the diagonal.
import type { Plate } from "../../data/plates";
import type { CelestialBody } from "../../data/solarSystem";
import { neighbourhoodShape } from "./neighbourhoodPlate";
import { computePlateLayout, SOLAR_SHAPE, type PlateLayout, type PlateShape } from "./solarPlate";

const SHAPES: Record<string, (bodies: CelestialBody[]) => PlateShape> = {
  solar: () => SOLAR_SHAPE,
  neighbourhood: neighbourhoodShape,
};

/** A plate's layout on a screen of this size. */
export function composePlate(plate: Plate, width: number, height: number): PlateLayout {
  const bodies = plate.bodies.filter((b) => b !== plate.centre);
  const shape = SHAPES[plate.id]?.(bodies);
  if (!shape) throw new Error(`No composition for plate "${plate.id}"`);
  return computePlateLayout(plate.centre, bodies, width, height, shape);
}

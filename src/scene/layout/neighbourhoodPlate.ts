// The stellar neighbourhood: Sol as a small point of light in the top-left corner, and
// its neighbours along the diagonal on arcs set by their distance in light-years. The
// distances keep their order and rough spacing, but the layout is drawn, not to scale.
import type { CelestialBody } from "../../data/solarSystem";
import type { PlateShape } from "./solarPlate";

/** Nearest and farthest neighbours sit at these fractions of the way to the far corner. */
const NEAR_STEP = 0.16;
// Short of the far corner, which holds the credit line.
const FAR_STEP = 0.86;

const SWINGS = [0.16, -0.12, 0.13, -0.1, 0.08, -0.14, 0.06];
const SPANS = [0.42, 0.38, 0.34, 0.31, 0.28, 0.25, 0.22];

/** The neighbourhood's composition: arcs placed by each star's distance in light-years. */
export function neighbourhoodShape(stars: CelestialBody[]): PlateShape {
  const ly = stars.map((s) => s.distanceLy ?? 0);
  const near = Math.min(...ly);
  const span = Math.max(...ly) - near || 1;
  return {
    centre: (unit) => {
      const r = Math.max(9, unit * 0.022);
      return { x: Math.max(44, unit * 0.09), y: Math.max(44, unit * 0.09), r };
    },
    steps: ly.map((d) => NEAR_STEP + ((d - near) / span) * (FAR_STEP - NEAR_STEP)),
    swings: SWINGS,
    spans: SPANS,
    // Points of light, sized by the star's (stylized) size: Sirius large, red dwarfs small.
    bodyRadius: (body, unit) => Math.max(5, unit * 0.016 * Math.pow(body.displayRadius, 0.6)),
    labelsAvoidReserved: true,
    bottomClear: 36,
  };
}

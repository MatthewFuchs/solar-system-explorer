// The site's plates: each scale of the map (the solar system, and later the stellar
// neighbourhood, the Milky Way, the Local Group) is one fixed, art-directed composition.
// A plate's own words live here; its bodies' content lives in their data files.
import { SITE, VIEWABLE, type CelestialBody } from "./solarSystem.ts";

export interface Plate {
  /** Stable id, used in code and CSS (`data-plate`). */
  id: string;
  /** Its URL segment ("" for the site's root). Unique across plates and bodies: URLs are flat. */
  path: string;
  /** The plate's title, bottom-left. Its last word breaks onto its own line on wide screens. */
  title: string;
  /** The introduction under the title. */
  intro: string;
  /** The tab title's second half, after the site name: what this plate is a map of. */
  tagline: string;
  /** One line for search results and link previews. */
  description: string;
  /** The small credit line, bottom-right, for the plate's images. */
  credit: string;
  /** The plate that holds this one, one scale out. */
  parent?: string;
  /** Every body with its own view on this plate, in reading order. */
  bodies: CelestialBody[];
}

export const SOLAR_PLATE: Plate = {
  id: "solar",
  path: "",
  title: "The Solar System",
  intro:
    "A chart of the Sun's family, from the scorched to the frozen. Distances are in AU, the span from Earth to the Sun. Choose a world, and it will come to you.",
  tagline: "An interactive map of the solar system",
  description: SITE.description,
  credit: "Textures: Solar System Scope, CC BY 4.0. Pluto: NASA/JHUAPL/SwRI.",
  bodies: VIEWABLE,
};

/** Every plate, innermost first. */
export const PLATES: Plate[] = [SOLAR_PLATE];

/** The plate a body belongs to. */
export function plateOf(bodyId: string): Plate | undefined {
  return PLATES.find((p) => p.bodies.some((b) => b.id === bodyId));
}

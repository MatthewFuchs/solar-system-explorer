// Every page of the site, and how URLs name them. URLs are flat: `/` is the solar system,
// `/mars` a world on it, and other plates get their own segment (`/neighbourhood`). Each
// segment is unique across plates and bodies, so one segment always names one page.
import { PLATES, SOLAR_PLATE, type Plate } from "../data/plates.ts";
import type { CelestialBody } from "../data/solarSystem.ts";

/** A page: a plate's overview (body null), or one body's view on that plate. */
export interface Route {
  plate: Plate;
  body: CelestialBody | null;
}

/** Every page, in reading order: each plate's overview, then its bodies. */
export const PAGES: Route[] = PLATES.flatMap((plate) => [{ plate, body: null }, ...plate.bodies.map((body) => ({ plate, body }))]);

/** The URL segment of a page ("" for the site's root). */
export function segmentOf(route: Route): string {
  return route.body ? route.body.id : route.plate.path;
}

const BY_SEGMENT = new Map(PAGES.map((r) => [segmentOf(r), r]));

/** The page a URL segment names, if any. */
export function routeFor(segment: string): Route | null {
  return BY_SEGMENT.get(segment) ?? null;
}

/** The site's front page: the solar system's overview. */
export const HOME: Route = { plate: SOLAR_PLATE, body: null };

/**
 * The page named by a path such as `/mars` or, on the front page, an older `#mars` link.
 * Anything else opens the front page.
 */
export function routeFromLocation(pathname: string, hash: string, base: string): Route {
  const fromPath = pathname.startsWith(base) ? pathname.slice(base.length).replace(/\/$/, "") : "";
  let fromHash = "";
  try {
    fromHash = decodeURIComponent(hash.slice(1));
  } catch {
    // A malformed hash such as "#%" names nothing.
  }
  return routeFor(fromPath || fromHash) ?? HOME;
}

/** The path of a page under the site's base path. */
export function pathFor(route: Route, base: string): string {
  return `${base}${segmentOf(route)}`;
}

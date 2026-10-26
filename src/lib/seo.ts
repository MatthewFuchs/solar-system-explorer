import { SITE, type CelestialBody } from "../data/solarSystem.ts";

/** The page title for a world, or the overview. The prerendered pages use the same titles. */
export function pageTitle(body?: CelestialBody): string {
  return body ? `${body.name} · ${SITE.name}` : `${SITE.name} · An interactive map of the solar system`;
}

/** The path of a world's page, or the overview. */
export function pagePath(id: string | null): string {
  return `${import.meta.env.BASE_URL}${id ?? ""}`;
}

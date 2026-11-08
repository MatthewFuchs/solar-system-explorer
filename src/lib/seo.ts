import { SITE } from "../data/solarSystem.ts";
import { pathFor, type Route } from "./routes.ts";

/** The page title for a world, or a plate's overview. The prerendered pages use the same titles. */
export function pageTitle(route: Route): string {
  return route.body ? `${route.body.name} · ${SITE.name}` : `${SITE.name} · ${route.plate.tagline}`;
}

/** The path of a page in the running app, under Vite's base path. */
export function pagePath(route: Route): string {
  return pathFor(route, import.meta.env.BASE_URL);
}

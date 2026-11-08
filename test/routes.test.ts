import { describe, expect, it } from "vitest";
import { PLATES, SOLAR_PLATE, plateOf } from "../src/data/plates";
import { VIEWABLE } from "../src/data/solarSystem";
import { HOME, PAGES, pathFor, routeFor, routeFromLocation, segmentOf } from "../src/lib/routes";

describe("pages", () => {
  it("lists each plate's overview, then its bodies", () => {
    expect(PAGES[0]).toEqual(HOME);
    expect(PAGES.filter((r) => r.body).map((r) => r.body!.id)).toEqual(PLATES.flatMap((p) => p.bodies.map((b) => b.id)));
  });

  it("gives every page its own URL segment", () => {
    const segments = PAGES.map(segmentOf);
    expect(new Set(segments).size).toBe(segments.length);
  });

  it("finds a body's plate", () => {
    expect(plateOf("mars")).toBe(SOLAR_PLATE);
    expect(plateOf("nowhere")).toBeUndefined();
  });
});

describe("routeFromLocation", () => {
  const at = (path: string, hash = "", base = "/") => routeFromLocation(path, hash, base);

  it("opens every world from its path, with or without a trailing slash", () => {
    for (const body of VIEWABLE) {
      expect(at(`/${body.id}`).body).toBe(body);
      expect(at(`/${body.id}/`).body).toBe(body);
    }
  });

  it("reads older #mars links on the front page", () => {
    expect(at("/", "#mars").body?.id).toBe("mars");
    expect(at("/", "#%").body).toBeNull();
  });

  it("lets the path win over a hash", () => {
    expect(at("/venus", "#mars").body?.id).toBe("venus");
  });

  it("opens the front page for anything it doesn't know", () => {
    expect(at("/")).toEqual(HOME);
    expect(at("/", "#atlantis")).toEqual(HOME);
    expect(at("/elsewhere/mars")).toEqual(HOME);
  });

  it("reads paths under the site's base path (GitHub Pages)", () => {
    expect(at("/repo/mars", "", "/repo/").body?.id).toBe("mars");
    expect(at("/repo/", "", "/repo/")).toEqual(HOME);
    expect(pathFor(routeFor("mars")!, "/repo/")).toBe("/repo/mars");
    expect(pathFor(HOME, "/repo/")).toBe("/repo/");
  });
});

import { describe, expect, it } from "vitest";
import { HOME, routeFor } from "../src/lib/routes";
import { initialNav, navReducer, type NavState } from "../src/state/navigation";

const mars = routeFor("mars")!;
const venus = routeFor("venus")!;
const run = (state: NavState, ...actions: Parameters<typeof navReducer>[1][]) => actions.reduce(navReducer, state);

describe("navigation", () => {
  it("starts at rest on the page the URL names", () => {
    expect(initialNav(HOME).phase).toBe("overview");
    expect(initialNav(mars)).toMatchObject({ shown: mars, phase: "planet", poiIndex: 0 });
  });

  it("zooms into a body, facing its first point of interest, then rests", () => {
    const entering = run(initialNav(HOME), { type: "go", to: mars });
    expect(entering).toMatchObject({ shown: mars, target: mars, phase: "entering", poiIndex: 0 });
    expect(run(entering, { type: "settle" }).phase).toBe("planet");
  });

  it("keeps the body shown while it flies back, then shows the plate", () => {
    const leaving = run(initialNav(mars), { type: "poi", index: 2 }, { type: "go", to: HOME });
    expect(leaving).toMatchObject({ shown: mars, target: HOME, phase: "leaving", poiIndex: 2 });
    expect(run(leaving, { type: "settle" })).toMatchObject({ shown: HOME, phase: "overview" });
  });

  it("turns back toward the body when interrupted on the way out", () => {
    const state = run(initialNav(mars), { type: "go", to: HOME }, { type: "go", to: mars });
    expect(state).toMatchObject({ shown: mars, phase: "entering" });
  });

  it("ignores a second request for the page it is already heading to", () => {
    const entering = run(initialNav(HOME), { type: "go", to: mars });
    expect(navReducer(entering, { type: "go", to: routeFor("mars")! })).toBe(entering);
  });

  it("switches straight to another body", () => {
    expect(run(initialNav(mars), { type: "go", to: venus })).toMatchObject({ shown: venus, phase: "entering" });
  });

  it("arrives at rest on another plate, from anywhere", () => {
    const neighbourhood = routeFor("neighbourhood")!;
    const sirius = routeFor("sirius")!;
    expect(run(initialNav(mars), { type: "go", to: neighbourhood })).toEqual(initialNav(neighbourhood));
    expect(run(initialNav(HOME), { type: "go", to: sirius })).toEqual(initialNav(sirius));
    // Even mid-zoom: leaving Mars for the neighbourhood doesn't wait for Mars to fly back.
    expect(run(initialNav(mars), { type: "go", to: HOME }, { type: "go", to: neighbourhood })).toMatchObject({ shown: neighbourhood, phase: "overview" });
  });

  it("does nothing on settle when already at rest", () => {
    const rest = initialNav(HOME);
    expect(navReducer(rest, { type: "settle" })).toBe(rest);
    expect(navReducer(rest, { type: "poi", index: 0 })).toBe(rest);
  });
});

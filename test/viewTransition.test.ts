import { Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { Euler } from "three";
import {
  easeInOutCubic,
  faceRotation,
  fitOrbitAngle,
  lerp,
  nearestAngle,
  smoothstep,
  surfacePoint,
  Timeline,
  zoomPlacement,
  ZOOM_MS,
} from "../src/scene/viewTransition";

describe("easing helpers", () => {
  it("ease in and out between fixed ends", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.1)).toBeLessThan(0.1);
  });

  it("clamp smoothstep and interpolate linearly", () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
  });
});

describe("Timeline", () => {
  it("runs a full zoom in the given duration", () => {
    const t = new Timeline(0);
    t.play(1, ZOOM_MS, 0);
    expect(t.progress(ZOOM_MS / 2)).toBeCloseTo(0.5);
    expect(t.done(ZOOM_MS - 1)).toBe(false);
    expect(t.done(ZOOM_MS)).toBe(true);
    expect(t.value(ZOOM_MS)).toBe(1);
  });

  it("reverses mid-flight over the time already spent", () => {
    const t = new Timeline(0);
    t.play(1, 1000, 0);
    t.play(0, 1000, 400);
    expect(t.progress(400)).toBeCloseTo(0.4);
    expect(t.remaining(400)).toBeCloseTo(400);
    expect(t.progress(800)).toBeCloseTo(0);
  });

  it("stays put when started at rest", () => {
    const t = new Timeline(1);
    expect(t.value(0)).toBe(1);
    expect(t.done(0)).toBe(true);
  });
});

describe("sphere geometry", () => {
  it("maps latitude and longitude to unit vectors", () => {
    const v = new Vector3();
    for (const [lat, lon] of [[0, 0], [45, 90], [-60, -135], [90, 0]]) {
      expect(surfacePoint(lat, lon, v).length()).toBeCloseTo(1);
    }
    expect(surfacePoint(90, 0, v).y).toBeCloseTo(1);
  });

  it("turns the short way round", () => {
    const turn = Math.PI * 2;
    expect(nearestAngle(0.1, turn * 3)).toBeCloseTo(turn * 3 + 0.1);
    expect(Math.abs(nearestAngle(3, -3) - -3)).toBeLessThanOrEqual(Math.PI);
  });
});

describe("zoomPlacement", () => {
  const frame = { from: { x: 100, y: 100, r: 10 }, to: { x: 500, y: 300, r: 200 } };
  const other = { x: 150, y: 100, r: 5 };

  it("leaves everything in place at rest or without a frame", () => {
    expect(zoomPlacement(other, frame, 0, false)).toBe(other);
    expect(zoomPlacement(other, null, 1, false)).toBe(other);
  });

  it("flies the focused planet to its feature placement", () => {
    const end = zoomPlacement(frame.from, frame, 1, true);
    expect(end.x).toBeCloseTo(500);
    expect(end.y).toBeCloseTo(300);
    expect(end.r).toBeCloseTo(200);
  });

  it("scales everything else outward from the focus", () => {
    const end = zoomPlacement(other, frame, 1, false);
    // 50px right of the focus, scaled 20x.
    expect(end.x).toBeCloseTo(500 + 50 * 20);
    expect(end.y).toBeCloseTo(300);
    expect(end.r).toBeCloseTo(100);
  });

  it("zooms evenly: halfway in time is halfway in log scale", () => {
    expect(zoomPlacement(frame.from, frame, 0.5, true).r).toBeCloseTo(10 * Math.sqrt(20));
  });
});

describe("fitOrbitAngle", () => {
  const to = { x: 500, y: 400, r: 100 };

  const spot = (angle: number, distance: number) => {
    const a = (angle * Math.PI) / 180;
    return { x: to.x + Math.cos(a) * distance * to.r, y: to.y - Math.sin(a) * distance * to.r };
  };

  it("keeps an object's own angle when it fits", () => {
    expect(fitOrbitAngle(0, 2, 10, to, 1000, 800)).toBe(0);
    expect(fitOrbitAngle(135, 2, 10, to, 1000, 800)).toBe(135);
  });

  it("turns an object along its orbit to keep it on screen", () => {
    // Straight up from y=400 by 3.8 radii is off the top.
    const angle = fitOrbitAngle(90, 3.8, 10, to, 1000, 800);
    expect(angle).not.toBe(90);
    const { y } = spot(angle, 3.8);
    expect(y - 10).toBeGreaterThanOrEqual(56);
  });

  it("keeps clear of the text column", () => {
    const angle = fitOrbitAngle(180, 2, 10, to, 1000, 800, 450);
    expect(spot(angle, 2).x - 10).toBeGreaterThanOrEqual(450);
  });

  it("settles on the least spill when nothing fits", () => {
    expect(Number.isFinite(fitOrbitAngle(30, 50, 10, to, 1000, 800))).toBe(true);
  });
});

describe("faceRotation", () => {
  const facing = (lat: number, lon: number) => {
    const [x, y] = faceRotation(lat, lon);
    return surfacePoint(lat, lon, new Vector3()).applyEuler(new Euler(x, y, 0));
  };

  it("turns an equatorial point straight toward the viewer", () => {
    for (const lon of [-180, -90, -30, 0, 45, 137, 180]) {
      const v = facing(0, lon);
      expect(v.x, `lon ${lon}`).toBeCloseTo(0);
      expect(v.y, `lon ${lon}`).toBeCloseTo(0);
      expect(v.z, `lon ${lon}`).toBeCloseTo(1);
    }
  });

  it("corrects latitude only partly, so poles keep their lean", () => {
    for (const lat of [-60, -20, 35, 80]) {
      const v = facing(lat, 70);
      expect(v.x, `lat ${lat}`).toBeCloseTo(0);
      expect(v.y, `lat ${lat}`).toBeCloseTo(Math.sin(((lat / 4) * Math.PI) / 180));
    }
  });
});

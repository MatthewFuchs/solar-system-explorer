import { Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { easeInOutCubic, lerp, nearestAngle, smoothstep, surfacePoint, Timeline, ZOOM_MS } from "../src/scene/viewTransition";

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

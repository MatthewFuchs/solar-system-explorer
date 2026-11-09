import { describe, expect, it } from "vitest";
import { NEIGHBOURHOOD_PLATE, SOLAR_PLATE } from "../src/data/plates";
import { composePlate } from "../src/scene/layout/plates";
import {
  applyStage,
  AU_PER_LY,
  endScale,
  formatSpan,
  IDENTITY_STAGE,
  innerStage,
  outerStage,
  ringRadius,
  solPoint,
  swapScale,
  voyageProgress,
  voyageScale,
  hurryVoyageClock,
  startVoyageClock,
  tickVoyageClock,
  VOYAGE_MAX_STEP_MS,
  VOYAGE_MS,
  VOYAGE_SKIP_MS,
  type VoyageEnds,
} from "../src/scene/voyage";

const solar = composePlate(SOLAR_PLATE, 1440, 900);
const chart = composePlate(NEIGHBOURHOOD_PLATE, 1440, 900);
const ends: VoyageEnds = {
  inner: { x: solar.sun.x, y: solar.sun.y, auPerPx: solar.auPerPx },
  outer: { x: chart.sun.x, y: chart.sun.y, auPerPx: chart.auPerPx },
};

describe("scales", () => {
  it("reads the solar plate's scale off Pluto's real distance", () => {
    const pluto = solar.planets.find((p) => p.body.id === "pluto")!;
    expect(solar.auPerPx * pluto.orbitR).toBeCloseTo(39.5, 6);
  });

  it("reads the chart's scale off its light-year rings", () => {
    expect(chart.auPerPx * chart.chart!.rings[0].r).toBeCloseTo(2 * AU_PER_LY, 3);
  });

  it("spans several orders of magnitude between the two plates", () => {
    expect(Math.log10(1 / endScale(ends))).toBeGreaterThan(4);
  });
});

describe("the zoom", () => {
  it("starts at the inner plate and ends at the outer plate's own scale", () => {
    expect(voyageScale(0, ends)).toBe(1);
    expect(voyageScale(1, ends)).toBeCloseTo(endScale(ends), 12);
    expect(outerStage(voyageScale(1, ends), ends).s).toBeCloseTo(1, 9);
  });

  it("only ever pulls back, never forward", () => {
    let last = Infinity;
    for (let t = 0; t <= 1.0001; t += 0.01) {
      const z = voyageScale(t, ends);
      expect(z).toBeLessThanOrEqual(last);
      last = z;
    }
  });

  it("spends about equal time on each tenfold step through the middle", () => {
    const step = (t: number) => voyageProgress(t + 0.1) - voyageProgress(t);
    expect(step(0.35) / step(0.55)).toBeGreaterThan(0.8);
    expect(step(0.35) / step(0.55)).toBeLessThan(1.25);
  });

  it("swaps plates while neither shows", () => {
    const z = swapScale(ends);
    expect(innerStage(z, ends).opacity).toBe(0);
    expect(outerStage(z, ends).opacity).toBe(0);
    expect(solPoint(z, ends).opacity).toBe(1);
  });

  it("leaves both plates exactly at rest at its ends", () => {
    const start = innerStage(1, ends);
    expect(start).toMatchObject({ s: 1, px: ends.inner.x, py: ends.inner.y, opacity: 1, lines: 1 });
    const end = outerStage(endScale(ends), ends);
    expect(end.s).toBeCloseTo(1, 9);
    expect(end.opacity).toBe(1);
    expect(end.lines).toBe(1);
  });

  it("carries the Sun to where Sol stands on the chart as the solar system collapses", () => {
    const late = innerStage(0.01, ends);
    expect(late.px).toBeCloseTo(ends.outer.x, 6);
    expect(late.py).toBeCloseTo(ends.outer.y, 6);
  });

  it("brings the chart's labels in late and takes the solar labels out early, so text is never huge or tiny", () => {
    expect(innerStage(0.2, ends).lines).toBe(0);
    expect(innerStage(0.2, ends).opacity).toBe(1);
    expect(outerStage(endScale(ends) * 2, ends).lines).toBe(0);
  });
});

describe("what lies between", () => {
  it("draws milestones to true scale: one light-year matches the chart's own scale at the end", () => {
    const r = ringRadius(AU_PER_LY, endScale(ends), ends);
    expect(r * chart.auPerPx).toBeCloseTo(AU_PER_LY, 3);
  });

  it("keeps a star a point as it closes in, and shrinks bodies as the view pulls back", () => {
    const star = { x: chart.sun.x + 100, y: chart.sun.y, r: 5 };
    const far = applyStage(star, outerStage(endScale(ends) * 6, ends));
    expect(far.r).toBe(5);
    expect(far.x - chart.sun.x).toBeCloseTo(600, 6);
    expect(applyStage({ x: 0, y: 0, r: 40 }, innerStage(0.1, ends)).r).toBeCloseTo(4, 9);
    expect(applyStage(star, IDENTITY_STAGE)).toBe(star);
  });

  it("writes the view's span in AU, then light-years", () => {
    expect(formatSpan(163)).toBe("160 AU");
    expect(formatSpan(12345)).toBe("12,000 AU");
    expect(formatSpan(1.6 * AU_PER_LY)).toBe("1.6 light-years");
    expect(formatSpan(47 * AU_PER_LY)).toBe("47 light-years");
  });
});

describe("the voyage's clock", () => {
  it("runs the whole voyage in VOYAGE_MS at a steady frame rate", () => {
    let c = startVoyageClock(1000);
    for (let now = 1016; now <= 1000 + VOYAGE_MS; now += 16) c = tickVoyageClock(c, now);
    expect(c.t).toBeGreaterThan(0.99);
    expect(tickVoyageClock(c, 1000 + VOYAGE_MS + 50).t).toBe(1);
  });

  it("pauses through a stalled frame instead of skipping ahead", () => {
    let c = startVoyageClock(0);
    // A three-second hitch, longer than half the voyage, moves it on by one step only.
    c = tickVoyageClock(c, 3000);
    expect(c.t).toBeCloseTo(VOYAGE_MAX_STEP_MS / VOYAGE_MS, 6);
    // The first frame arriving after the whole voyage's time still starts it from the beginning.
    expect(tickVoyageClock(startVoyageClock(0), VOYAGE_MS * 2).t).toBeLessThan(0.05);
  });

  it("once hurried, finishes what's left in VOYAGE_SKIP_MS, once", () => {
    let c = startVoyageClock(0);
    for (let now = 16; now <= 1600; now += 16) c = tickVoyageClock(c, now);
    const from = c.t;
    c = hurryVoyageClock(c);
    expect(hurryVoyageClock(c)).toBe(c);
    for (let now = 1616; now < 1600 + VOYAGE_SKIP_MS - 16; now += 16) c = tickVoyageClock(c, now);
    expect(c.t).toBeGreaterThan(from);
    expect(c.t).toBeLessThan(1);
    c = tickVoyageClock(c, 1600 + VOYAGE_SKIP_MS + 16);
    expect(c.t).toBe(1);
    // However slow the frames: one long frame after a hurry still ends it.
    expect(tickVoyageClock(hurryVoyageClock(startVoyageClock(0)), 2000).t).toBe(1);
  });
});

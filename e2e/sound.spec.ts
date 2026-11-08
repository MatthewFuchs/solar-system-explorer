import { expectOverview, expectPlanetView, openApp, test, expect } from "./fixtures";

declare global {
  interface Window {
    __audio: { contexts: number; curves: number[][]; starts: number[]; cutoffs: number };
  }
}

/**
 * Watch Web Audio from inside the page: how many AudioContexts the app makes, and every
 * pitch glide it schedules (only planet songs glide, via setValueCurveAtTime).
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__audio = { contexts: 0, curves: [], starts: [], cutoffs: 0 };
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(...args: ConstructorParameters<typeof AudioContext>) {
        super(...args);
        window.__audio.contexts++;
      }
    };
    // Every oscillator's starting pitch, and every song cut short (a fast fade to silence).
    const start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...args) {
      window.__audio.starts.push(this.frequency.value);
      return start.apply(this, args);
    };
    const setTarget = AudioParam.prototype.setTargetAtTime;
    AudioParam.prototype.setTargetAtTime = function (value, time, constant) {
      if (value === 0 && constant === 0.08) window.__audio.cutoffs++;
      return setTarget.call(this, value, time, constant);
    };
    const setCurve = AudioParam.prototype.setValueCurveAtTime;
    AudioParam.prototype.setValueCurveAtTime = function (values, ...rest) {
      window.__audio.curves.push(Array.from(values));
      return setCurve.call(this, values, ...rest);
    };
  });
});

const audio = (page: import("@playwright/test").Page) => page.evaluate(() => window.__audio);

test("stays silent until the sound toggle is clicked", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: /^Mars,/ }).hover();
  await page.getByRole("button", { name: /^Mars,/ }).click();
  await expectPlanetView(page, "Mars");
  await page.keyboard.press("Escape");
  // No AudioContext at all: nothing plays, or is even prepared, without the toggle.
  expect(await audio(page)).toEqual({ contexts: 0, curves: [], starts: [], cutoffs: 0 });
});

test("sings a world's song, gliding by Kepler's ratio, only while sound is on", async ({ page }) => {
  await openApp(page);
  const sound = page.getByRole("button", { name: "Sound" });
  await sound.click();
  await expect.poll(async () => (await audio(page)).contexts).toBe(1);

  await page.getByRole("button", { name: /^Mars,/ }).click();
  await expect.poll(async () => (await audio(page)).curves.length).toBeGreaterThan(0);
  const e = 0.0934; // Mars's eccentricity in the data file
  for (const curve of (await audio(page)).curves) {
    expect(Math.max(...curve) / Math.min(...curve)).toBeCloseTo(((1 + e) / (1 - e)) ** 2, 3);
  }
  await expectPlanetView(page, "Mars");
  await page.keyboard.press("Escape");
  await expectOverview(page);

  // Off again: choosing another world adds no song, and no second AudioContext is made.
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  const before = (await audio(page)).curves.length;
  await page.getByRole("button", { name: /^Jupiter,/ }).click();
  await expectPlanetView(page, "Jupiter");
  expect(await audio(page)).toMatchObject({ contexts: 1 });
  expect((await audio(page)).curves).toHaveLength(before);
});

test("plays the Sun a low chord instead of a glide", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "Sound" }).click();
  await page.getByRole("button", { name: /^Sun,/ }).click();
  const near = (f: number) => async () => (await audio(page)).starts.some((s) => Math.abs(s - f) < 0.01);
  // D2, A2, D3.
  for (const f of [73.42, 110, 146.83]) await expect.poll(near(f), `${f} Hz`).toBe(true);
  expect((await audio(page)).curves).toEqual([]);
});

test("cuts the last song short when another world is chosen", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "Sound" }).click();
  await page.getByRole("button", { name: /^Mars,/ }).click();
  await expectPlanetView(page, "Mars");
  expect((await audio(page)).cutoffs).toBe(0);
  await page.keyboard.press("Escape");
  await expectOverview(page);
  await page.getByRole("button", { name: /^Jupiter,/ }).click();
  await expect.poll(async () => (await audio(page)).cutoffs).toBe(1);
});

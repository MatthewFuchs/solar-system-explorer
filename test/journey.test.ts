import { describe, expect, it } from "vitest";
import { MYSTERIES, type Mystery } from "../src/data/mysteries";
import { PLANETS } from "../src/data/solarSystem";
import { createJourney, EMPTY_JOURNEY, entryCount, JOURNEY_KEY, parseJourney, triggered } from "../src/lib/journey";
import { routeFor } from "../src/lib/routes";
import { skyDayFor } from "../src/data/skyDays";

/** A Map-backed stand-in for localStorage. */
function memoryStorage(initial?: string) {
  const m = new Map<string, string>(initial === undefined ? [] : [[JOURNEY_KEY, initial]]);
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    raw: () => m.get(JOURNEY_KEY),
  };
}

const TEST_MYSTERIES: Mystery[] = [
  { id: "a", title: "A", clue: "", entry: "", trigger: { kind: "visited-any", ids: ["mars", "venus"] } },
  { id: "b", title: "B", clue: "", entry: "", trigger: { kind: "visited-all", ids: ["mars", "venus"] } },
  { id: "c", title: "C", clue: "", entry: "", trigger: { kind: "read-count", min: 2 } },
];

describe("the journey store", () => {
  it("records visits and reads once each, and keeps them in storage", () => {
    const storage = memoryStorage();
    const j = createJourney(storage, TEST_MYSTERIES, () => 1000);
    j.record({ type: "visit", id: "mars" });
    j.record({ type: "visit", id: "mars" });
    j.record({ type: "read", id: "mars-olympus-mons" });
    expect(j.get().visited).toEqual(["mars"]);
    expect(j.get().read).toEqual(["mars-olympus-mons"]);
    expect(createJourney(storage, TEST_MYSTERIES).get()).toEqual(j.get());
  });

  it("solves each mystery once, the moment its trigger is met, and says which", () => {
    const j = createJourney(memoryStorage(), TEST_MYSTERIES, () => 1234);
    expect(j.record({ type: "visit", id: "mars" }).map((m) => m.id)).toEqual(["a"]);
    expect(j.record({ type: "visit", id: "venus" }).map((m) => m.id)).toEqual(["b"]);
    expect(j.record({ type: "visit", id: "earth" })).toEqual([]);
    j.record({ type: "read", id: "x" });
    expect(j.record({ type: "read", id: "y" }).map((m) => m.id)).toEqual(["c"]);
    expect(j.get().found).toEqual({ a: 1234, b: 1234, c: 1234 });
    expect(entryCount(j.get())).toBe(3);
  });

  it("tells subscribers when it changes, and forgets everything when asked", () => {
    const storage = memoryStorage();
    const j = createJourney(storage, TEST_MYSTERIES);
    let calls = 0;
    const off = j.subscribe(() => calls++);
    j.record({ type: "visit", id: "mars" });
    expect(calls).toBe(1);
    j.forget();
    expect(calls).toBe(2);
    expect(j.get()).toEqual(EMPTY_JOURNEY);
    expect(storage.raw()).toBeUndefined();
    off();
    j.record({ type: "visit", id: "venus" });
    expect(calls).toBe(2);
  });

  it("starts fresh from anything it doesn't understand: corrupt, foreign, or a future version", () => {
    for (const raw of ["{", "null", "[]", '"hi"', '{"v":2,"visited":[],"read":[],"found":{}}', '{"v":1,"visited":[1],"read":[],"found":{}}', '{"v":1,"visited":[],"read":[]}']) {
      expect(parseJourney(raw), raw).toEqual(EMPTY_JOURNEY);
    }
    expect(parseJourney('{"v":1,"visited":["mars","mars"],"read":[],"found":{"a":5,"b":"soon"}}')).toEqual({ v: 1, visited: ["mars"], read: [], found: { a: 5 } });
  });

  it("works for the page's life when storage is blocked, and when it throws", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    for (const storage of [null, throwing]) {
      const j = createJourney(storage, TEST_MYSTERIES);
      expect(j.record({ type: "visit", id: "mars" }).map((m) => m.id)).toEqual(["a"]);
      expect(() => j.forget()).not.toThrow();
    }
  });
});

describe("easter eggs", () => {
  it("are found only by discover(), once, never by a trigger", () => {
    const eggs: Mystery[] = [{ id: "egg", title: "Egg", clue: "", entry: "", trigger: { kind: "secret" } }];
    const j = createJourney(memoryStorage(), eggs, () => 7);
    expect(j.record({ type: "visit", id: "mars" })).toEqual([]);
    expect(j.discover("egg").map((m) => m.id)).toEqual(["egg"]);
    expect(j.discover("egg")).toEqual([]);
    expect(j.discover("no-such-egg")).toEqual([]);
    expect(j.get().found).toEqual({ egg: 7 });
  });

  it("each have a reveal, the line shown the moment they're found", () => {
    for (const m of MYSTERIES.filter((m) => m.trigger.kind === "secret")) expect(m.reveal, m.id).toBeTruthy();
  });
});

describe("the logbook's mysteries", () => {
  it("each have an id, title, clue, and entry, ids unique", () => {
    expect(new Set(MYSTERIES.map((m) => m.id)).size).toBe(MYSTERIES.length);
    for (const m of MYSTERIES) for (const field of [m.title, m.clue, m.entry]) expect(field.length, m.id).toBeGreaterThan(5);
  });

  it("only ask for pages that exist", () => {
    for (const m of MYSTERIES) {
      if (m.trigger.kind === "read-count" || m.trigger.kind === "secret") continue;
      for (const id of m.trigger.ids) {
        const page = id.startsWith("plate:") ? routeFor(id.slice(6) === "solar" ? "" : id.slice(6)) : routeFor(id);
        expect(page, `${m.id}: ${id}`).not.toBeNull();
      }
    }
  });

  it("the Grand Tour asks for all eight planets", () => {
    const tour = MYSTERIES.find((m) => m.id === "grand-tour")!;
    const visited = { ...EMPTY_JOURNEY, visited: PLANETS.slice(0, 7).map((p) => p.id) };
    expect(triggered(tour.trigger, visited)).toBe(false);
    expect(triggered(tour.trigger, { ...visited, visited: PLANETS.map((p) => p.id) })).toBe(true);
    expect(PLANETS).toHaveLength(8);
  });
});

describe("sky on the day", () => {
  it("knows the meteor showers' peak nights, every year, and nothing between them", () => {
    expect(skyDayFor(new Date(2026, 7, 12))?.id).toBe("perseids");
    expect(skyDayFor(new Date(2031, 7, 11))?.id).toBe("perseids");
    expect(skyDayFor(new Date(2026, 7, 14))).toBeNull();
    expect(skyDayFor(new Date(2026, 10, 17))?.id).toBe("leonids");
    expect(skyDayFor(new Date(2026, 11, 14))?.id).toBe("geminids");
    expect(skyDayFor(new Date(2026, 10, 8))).toBeNull();
    expect(skyDayFor(new Date(2026, 0, 1))).toBeNull();
  });
});

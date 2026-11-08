// The visitor's journey: where they've been, what they've read, and what they've discovered.
// Kept in this browser only (one localStorage key), never sent anywhere. Three-free and pure
// apart from storage, so the game layer stays out of the 3D chunk.
import { useSyncExternalStore } from "react";
import { MYSTERIES, type Mystery, type Trigger } from "../data/mysteries";

export const JOURNEY_KEY = "sse-journey-v1";

export interface JourneyState {
  v: 1;
  /** Pages opened: body ids, and plates as "plate:<id>". */
  visited: string[];
  /** Points of interest (and spacecraft, belts) whose details were opened. */
  read: string[];
  /** Discoveries, by mystery id: when each was found (ms since 1970). */
  found: Record<string, number>;
}

export type JourneyEvent = { type: "visit"; id: string } | { type: "read"; id: string };

export const EMPTY_JOURNEY: JourneyState = { v: 1, visited: [], read: [], found: {} };

const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === "string");

/** A stored journey, if it is one this version understands; otherwise a fresh start. */
export function parseJourney(raw: string | null): JourneyState {
  if (!raw) return EMPTY_JOURNEY;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return EMPTY_JOURNEY;
    const d = data as Record<string, unknown>;
    if (d.v !== 1 || !isStrings(d.visited) || !isStrings(d.read) || typeof d.found !== "object" || d.found === null) return EMPTY_JOURNEY;
    const found: Record<string, number> = {};
    for (const [id, at] of Object.entries(d.found as Record<string, unknown>)) {
      if (typeof at === "number" && Number.isFinite(at)) found[id] = at;
    }
    return { v: 1, visited: [...new Set(d.visited)], read: [...new Set(d.read)], found };
  } catch {
    return EMPTY_JOURNEY;
  }
}

/** Whether a mystery's trigger is met by the journey so far. */
export function triggered(trigger: Trigger, s: JourneyState): boolean {
  switch (trigger.kind) {
    case "visited-any":
      return trigger.ids.some((id) => s.visited.includes(id));
    case "visited-all":
      return trigger.ids.every((id) => s.visited.includes(id));
    case "read-count":
      return s.read.length >= trigger.min;
    case "secret":
      return false;
  }
}

/** What storage the journey can use: localStorage, or nothing if the browser blocks it. */
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface Journey {
  get(): JourneyState;
  subscribe(listener: () => void): () => void;
  /** Note a visit or a read; returns any mysteries it solved, in order. */
  record(event: JourneyEvent): Mystery[];
  /** Mark an easter egg found (a "secret" mystery); returns it if it's newly found. */
  discover(id: string): Mystery[];
  /** Forget everything, here and in storage. */
  forget(): void;
}

export function createJourney(storage: Store | null, mysteries: Mystery[] = MYSTERIES, now: () => number = Date.now): Journey {
  let state = (() => {
    try {
      return parseJourney(storage?.getItem(JOURNEY_KEY) ?? null);
    } catch {
      return EMPTY_JOURNEY;
    }
  })();
  const listeners = new Set<() => void>();
  const save = () => {
    try {
      storage?.setItem(JOURNEY_KEY, JSON.stringify(state));
    } catch {
      // Storage full or blocked: the journey lasts as long as this page does.
    }
  };
  const emit = () => listeners.forEach((l) => l());

  return {
    get: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    record(event) {
      const list = event.type === "visit" ? state.visited : state.read;
      if (list.includes(event.id)) return [];
      const next: JourneyState = { ...state, [event.type === "visit" ? "visited" : "read"]: [...list, event.id] };
      const solved = mysteries.filter((m) => next.found[m.id] === undefined && triggered(m.trigger, next));
      if (solved.length) {
        const at = now();
        next.found = { ...next.found, ...Object.fromEntries(solved.map((m) => [m.id, at])) };
      }
      state = next;
      save();
      emit();
      return solved;
    },
    discover(id) {
      const mystery = mysteries.find((m) => m.id === id);
      if (!mystery || state.found[id] !== undefined) return [];
      state = { ...state, found: { ...state.found, [id]: now() } };
      save();
      emit();
      return [mystery];
    },
    forget() {
      state = EMPTY_JOURNEY;
      try {
        storage?.removeItem(JOURNEY_KEY);
      } catch {
        // Nothing stored to remove.
      }
      emit();
    },
  };
}

function browserStorage(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Some browsers throw on merely reading localStorage when it is blocked.
    return null;
  }
}

/** The visitor's journey in this browser. */
export const journey = createJourney(browserStorage());

/** The journey, kept current in a component. */
export function useJourney(): JourneyState {
  return useSyncExternalStore(journey.subscribe, journey.get, () => EMPTY_JOURNEY);
}

/** How many entries the logbook holds: a count, never "out of". */
export function entryCount(s: JourneyState): number {
  return Object.keys(s.found).length;
}

// Where the visitor is and where they are heading. Pure: the zoom timeline and its timer
// live in Overview, which dispatches `settle` when a transition finishes.
import { segmentOf, type Route } from "../lib/routes.ts";

/**
 * overview: a plate at rest. entering / leaving: zooming into or out of a body's view.
 * planet: a body's view at rest.
 */
export type ViewPhase = "overview" | "entering" | "planet" | "leaving";

export interface NavState {
  /** The page on screen. While leaving a body it is still that body, so it can fly back. */
  shown: Route;
  /** Where the current (or last) transition is heading. */
  target: Route;
  phase: ViewPhase;
  /** Which of the shown body's points of interest it faces. */
  poiIndex: number;
}

export type NavAction =
  | { type: "go"; to: Route }
  | { type: "settle" }
  | { type: "poi"; index: number };

/** The state for a page opened directly (from its URL): already at rest. */
export function initialNav(route: Route): NavState {
  return { shown: route, target: route, phase: route.body ? "planet" : "overview", poiIndex: 0 };
}

export const samePage = (a: Route, b: Route) => segmentOf(a) === segmentOf(b);

export function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case "go": {
      const { to } = action;
      if (samePage(to, state.target)) return state;
      // Into a body: it is shown from the start of the zoom, facing its first point of interest.
      if (to.body) return { shown: to, target: to, phase: "entering", poiIndex: 0 };
      // Out to the plate: the body stays shown until the zoom has carried it back.
      return { ...state, target: to, phase: "leaving" };
    }
    case "settle":
      if (state.phase === "entering") return { ...state, phase: "planet" };
      if (state.phase === "leaving") return { ...state, shown: state.target, phase: "overview" };
      return state;
    case "poi":
      return state.poiIndex === action.index ? state : { ...state, poiIndex: action.index };
  }
}

import { Component, type ReactNode } from "react";

/**
 * Keeps the page usable if the 3D scene can't run: its lazy chunk failed to load
 * (e.g. a stale tab after a redeploy) or WebGL is unavailable. The typography,
 * line work, and panels still render; only the planets are missing.
 */
export class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("3D scene failed to load", error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

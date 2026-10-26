import { Component, type ReactNode } from "react";

/** Why the 3D scene couldn't run: no WebGL, or its code or a texture failed to load. */
export type SceneFailure = "webgl" | "load";

interface SceneBoundaryProps {
  children: ReactNode;
  onError: (failure: SceneFailure) => void;
}

/**
 * Keeps the page usable if the 3D scene can't run: its lazy chunk or a texture failed
 * to load (e.g. a stale tab after a redeploy, a dropped connection) or WebGL is
 * unavailable. The typography, line work, and panels still work; Overview shows a
 * quiet note saying what happened (`SceneNotice`).
 */
export class SceneBoundary extends Component<SceneBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("3D scene failed", error);
    this.props.onError(error instanceof Error && /WebGL/i.test(error.message) ? "webgl" : "load");
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** A line under the title in place of the planets. */
export function SceneNotice({ failure }: { failure: SceneFailure }) {
  return (
    <p className="scene-notice" role="status" data-testid="scene-notice">
      {failure === "webgl" ? (
        "This browser can’t draw the planets: WebGL is unavailable."
      ) : (
        <>
          The planets couldn’t be drawn.{" "}
          <button type="button" className="scene-notice__retry" onClick={() => window.location.reload()}>
            Reload
          </button>
        </>
      )}
    </p>
  );
}

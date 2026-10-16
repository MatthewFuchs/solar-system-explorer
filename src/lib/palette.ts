// Deep-space HUD palette. Mirrors the CSS custom properties in src/index.css.
export const PALETTE = {
  /** Canvas background: near-black blue. */
  space: "#03050B",
  /** HUD line and text color: cool white. */
  hud: "#D8E8FF",
  /** Selection and active-state accent. */
  signal: "#8FD3FF",
  /** The Sun's warm light, used for its glow across the scene. */
  sunlight: "#FFB24D",
} as const;

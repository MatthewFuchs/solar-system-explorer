// Screen bands and the body view's framing, shared by every plate. CSS pixels.

/** Below this height (landscape phones) the layout goes compact. Matches index.css. */
export const SHORT_HEIGHT = 520;

/** Below this aspect ratio the title gets its own band at the bottom of the screen. */
export const PORTRAIT_ASPECT = 0.85;

/** Height of the top bar, which bodies keep clear of. Matches --bar-h in CSS. */
export const TOP_BAR_HEIGHT = 52;

/**
 * The focused planet in planet view: large, framed like a magazine feature image.
 * Landscape puts it right of the text column; portrait puts it above the text.
 * Ringed planets shrink so their rings stay in frame.
 */
export function computeFeaturePlacement(width: number, height: number, reach: number) {
  const ringScale = reach > 1 ? reach * 0.72 : 1;
  if (width / height < PORTRAIT_ASPECT) {
    return { x: width * 0.5, y: height * 0.28, r: Math.min(width * 0.32, height * 0.18) / ringScale };
  }
  return { x: width * 0.665, y: height * 0.52, r: Math.min(height * 0.34, width * 0.24) / ringScale };
}

/**
 * In the planet view, the x that moons and spacecraft keep right of: the text column's right
 * edge where it is a scrolling panel beside the planet (short landscape screens; mirrors
 * .feature__column in index.css). Elsewhere its text is narrow enough not to need one.
 */
export function featureKeepOut(width: number, height: number) {
  if (width / height < PORTRAIT_ASPECT || height >= SHORT_HEIGHT) return 0;
  const inset = Math.min(24, Math.max(12, width * 0.018));
  return inset + Math.min(72, Math.max(18, width * 0.04)) + Math.min(width * 0.42, 420) + 12;
}

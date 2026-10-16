import type { CSSProperties } from "react";

/** Stagger index for a panel's reveal; each line enters a beat after the one above it. */
export const line = (i: number) => ({ "--i": i }) as CSSProperties;

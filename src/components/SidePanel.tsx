import { useEffect, useRef, type AnimationEvent, type ReactNode, type RefObject } from "react";

export type PanelState = "open" | "closing";

interface SidePanelProps {
  state: PanelState;
  /** id of the heading that names the panel. */
  labelledBy: string;
  /** Element that receives focus when the panel opens (usually its heading). */
  focusRef: RefObject<HTMLElement | null>;
  closeLabel: string;
  onClose: () => void;
  /** Called once the closing animation has finished, to unmount the panel. */
  onClosed: () => void;
  children: ReactNode;
}

/**
 * The editorial sidebar shell (a bottom sheet on phones) shared by the detail and
 * credits panels. Non-modal: it closes with its X, Escape, or a click on empty space;
 * clicks on other controls (markers, Previous / Next) go through to them.
 */
export function SidePanel({ state, labelledBy, focusRef, closeLabel, onClose, onClosed, children }: SidePanelProps) {
  const panelRef = useRef<HTMLElement>(null);

  // Move focus into the panel when it opens, and give it back when it closes.
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    focusRef.current?.focus({ preventScroll: true });
    return () => {
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [focusRef]);

  useEffect(() => {
    if (state !== "open") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Closing the panel takes this Escape; it shouldn't also leave the planet view.
      e.preventDefault();
      onClose();
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target || panelRef.current?.contains(target) || target.closest("button, a, [role='dialog']")) return;
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [state, onClose]);

  const onAnimationEnd = (e: AnimationEvent) => {
    if (e.target === e.currentTarget && state === "closing") onClosed();
  };

  return (
    <aside
      ref={panelRef}
      className="poi-panel"
      data-state={state}
      role="dialog"
      aria-labelledby={labelledBy}
      onAnimationEnd={onAnimationEnd}
    >
      {children}
      {/* Last in tab order (after the content), though it sits top-right. */}
      <button type="button" className="poi-panel__close" onClick={onClose} aria-label={closeLabel}>
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M2 2 14 14M14 2 2 14" />
        </svg>
      </button>
    </aside>
  );
}

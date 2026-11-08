import { memo, useCallback, useState } from "react";
import { HOME } from "../lib/routes";
import { pagePath } from "../lib/seo";
import { CreditsPanel } from "./CreditsPanel";
import type { PanelState } from "./SidePanel";

interface TopBarProps {
  inOverview: boolean;
  /** The open plate's overview: its path, and how to get there. */
  overviewPath: string;
  onOverview: () => void;
  /** Back to the front page (the solar system), from the site's name. */
  onHome: () => void;
  /** Only plates with spacecraft offer the toggle. */
  hasSpacecraft: boolean;
  showSpacecraft: boolean;
  onToggleSpacecraft: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
}

/**
 * Quiet masthead in the top-right corner, clear of the Sun: site name, toggles for
 * spacecraft and sound, navigation, and credits.
 */
export const TopBar = memo(function TopBar({
  inOverview,
  overviewPath,
  onOverview,
  onHome,
  hasSpacecraft,
  showSpacecraft,
  onToggleSpacecraft,
  soundOn,
  onToggleSound,
}: TopBarProps) {
  const [credits, setCredits] = useState<PanelState | "closed">("closed");
  const closeCredits = useCallback(() => setCredits((c) => (c === "open" ? "closing" : c)), []);
  const closedCredits = useCallback(() => setCredits("closed"), []);

  const toOverview = (e: React.MouseEvent) => {
    e.preventDefault();
    onOverview();
  };
  const toHome = (e: React.MouseEvent) => {
    e.preventDefault();
    onHome();
  };

  return (
    <>
      <header className="masthead">
        <a className="masthead__brand" href={pagePath(HOME)} onClick={toHome}>
          Solar System Explorer
        </a>
        <nav className="masthead__nav" aria-label="Main">
          {inOverview && hasSpacecraft && (
            <button type="button" className="masthead__toggle" aria-pressed={showSpacecraft} onClick={onToggleSpacecraft}>
              <span className="masthead__toggle-mark" aria-hidden="true" />
              Spacecraft
            </button>
          )}
          <button type="button" className="masthead__toggle" aria-pressed={soundOn} onClick={onToggleSound}>
            <span className="masthead__toggle-mark" aria-hidden="true" />
            Sound
          </button>
          <a className="masthead__overview" href={overviewPath} aria-current={inOverview ? "page" : undefined} onClick={toOverview}>
            Overview
          </a>
          <button
            type="button"
            aria-expanded={credits !== "closed"}
            onClick={() => setCredits((c) => (c === "open" ? "closing" : "open"))}
          >
            Credits
          </button>
        </nav>
      </header>
      {credits !== "closed" && <CreditsPanel state={credits} onClose={closeCredits} onClosed={closedCredits} />}
    </>
  );
});

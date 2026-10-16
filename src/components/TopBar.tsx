import { useEffect, useState } from "react";

/**
 * Quiet masthead in the top-right corner, clear of the Sun: site name,
 * navigation, and texture credits.
 */
export function TopBar() {
  const [creditsOpen, setCreditsOpen] = useState(false);

  useEffect(() => {
    if (!creditsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCreditsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [creditsOpen]);

  return (
    <>
      <header className="masthead">
        <a className="masthead__brand" href="/">
          Solar System Explorer
        </a>
        <nav className="masthead__nav" aria-label="Main">
          <a href="/" aria-current="page">
            Overview
          </a>
          <button
            type="button"
            aria-expanded={creditsOpen}
            aria-controls="credits-panel"
            onClick={() => setCreditsOpen((open) => !open)}
          >
            Credits
          </button>
        </nav>
      </header>
      {creditsOpen && (
        <aside id="credits-panel" className="credits-panel" aria-label="Credits">
          <p>
            Planet, Sun, and ring textures by{" "}
            <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noreferrer">
              Solar System Scope
            </a>
            , licensed{" "}
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
              CC BY 4.0
            </a>
            . Planet maps resized for the web.
          </p>
          <p>Typefaces: Marcellus and Cormorant Garamond, via Google Fonts.</p>
        </aside>
      )}
    </>
  );
}

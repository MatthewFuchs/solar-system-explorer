# Content audit

Every fact, figure, and source on the site, checked in November 2026. This file records
what was checked, against what, and what changed, so the content can be trusted and kept
current.

## Rules
- **Sources are primary or institutional:** space agencies (NASA, ESA), observatories
  (ESO, NOIRLab, Keck, Green Bank, Chandra), scientific societies (AAS), and peer-reviewed
  papers (arXiv, NASA ADS). Popular astronomy outlets (Sky & Telescope, EarthSky) only for
  history and culture. **Never Wikipedia** or any other openly editable encyclopedia; a
  test (`test/neighbourhood.test.ts`, "sources") fails if one is cited. Each body's
  `wikipedia` field is not a citation: it only tells search engines which body a page is
  about.
- **Every fact is checked** against the source it cites, or against another source on
  this list. A fact that can't be confirmed is removed, not softened.
- "Learn more" links to the most relevant primary page for that point of interest.
- Numbers are rounded the way their source rounds them. Values that newer measurements
  change (e.g. Europa's ice shell) say when and how they were measured.

## How sources were checked
Each page was fetched and searched for the specific claim. Sites that block automated
requests (NASA ADS, Sky & Telescope, JPL, A&A, Britannica) were confirmed through search
results that quote the page. All 46 earlier links, and every new one, load for a reader.

## Corrections

| Where | Was | Now | Source |
|---|---|---|---|
| Sun, solar flares | "energy equivalent to millions of hydrogen bombs" | "as much energy as a billion hydrogen bombs" | NASA, Solar Storms and Flares |
| Jupiter, Europa | Ice shell 15–25 km | ~29 km where Juno looked (Juno Microwave Radiometer, reported Jan 2026) | NASA, "NASA's Juno Measures Thickness of Europa's Ice Shell" |
| Saturn, the Hexagon | Cited the Cassini mission page (which doesn't mention it); "side length ~14,500 km" | Cites NASA Saturn facts: ~30,000 km across, ~320 km/h winds | NASA, Saturn facts |
| Earth, Amazon | Wikipedia; "5.5 million km² across nine countries"; "one in ten known species" | Basin 6+ million km² across eight countries, ~80% rainforest; one-fifth of land species; makes its own rainy season | NASA Earth Observatory, "Mapping the Amazon"; NASA, "New study shows the Amazon makes its own rainy season" |
| Proxima b | "at least about the mass of Earth" | at least ~1.07 Earth masses; ~20× closer to its star than Earth is to the Sun | NASA Exoplanet Catalog |
| Barnard's Star planets | "Each is smaller than Earth" (radii are unknown: they were found by mass) | each 20–30% of Earth's mass | NOIRLab, noirlab2510 |
| Epsilon Eridani b | ~7.4-year orbit | 7.3 years, 0.66 Jupiter masses, 3.53 AU | NASA Exoplanet Catalog |
| Epsilon Eridani | "thought to be under a billion years old" (not supported by the cited page) | "much younger than the Sun" | NASA, SOFIA release |
| Sirius B | "Friedrich Bessel… 1844" (not in the cited page) | Hubble's 2005 measurement: 98% of the Sun's mass, ~12,000 km, ~25,000 °C, 350,000× Earth's gravity | ESA/Hubble heic0516 |
| Procyon B | "first seen in 1896" (not in the cited page) | removed; 1844 wobble, 0.59 Suns, 40.8-year orbit kept | AAS Nova |
| Tau Ceti | Proposed planets mentioned in passing | Own point of interest: four candidates (2017), masses as low as 1.7 Earths, two in the habitable zone, unconfirmed | W. M. Keck Observatory |

## Sources replaced (all formerly Wikipedia)

| Point of interest | Source now |
|---|---|
| Rigil Kentaurus, Toliman | Pourbaix & Boffin 2016, "Parallax and masses of α Centauri revisited" (arXiv:1601.01636): masses ~1.1 and ~0.9 Suns, 79.9-year orbit |
| Proxima Centauri | Kervella et al. 2017, "Proxima's orbit around α Centauri" (arXiv:1611.03495): bound, ~550,000-year orbit, discovered a century ago (1915) |
| Proxima b | NASA Exoplanet Catalog (formerly ESO eso1629, which gave the 2016 mass of ≥1.3 Earths) |
| The Runaway Star | Barnard 1916, Astronomical Journal 29, 181 (NASA ADS) |
| Four Small Worlds | NOIRLab noirlab2510 (ApJL, Basant et al. 2025) |
| Wolf 359 (all) | NASA Chandra X-ray Center, January 2025 release |
| Sirius A, Sirius B | ESA/Hubble heic0516 (2005) |
| The Dog Star | Sky & Telescope, "A Real Scorcher: Sirius at Heliacal Rising" |
| Rings of Dust | NASA, "SOFIA Confirms Nearby Planetary System is Similar to Our Own" |
| Epsilon Eridani b | NASA Exoplanet Catalog |
| Project Ozma | Green Bank Observatory, 85-1 Tatel Telescope |
| Procyon A, Procyon B | AAS Nova, "Orbit of a Giant and a Dwarf" (Bond et al. 2015, Hubble astrometry) |
| Tau Ceti (all) | W. M. Keck Observatory, "Four Earth-Sized Planets Found Orbiting the Nearest Sun-Like Star" |

## Added (thin areas)
- **Barnard's Star:** Barnard b (ESO eso2414: 3.15-day orbit, ~125 °C, 20× closer than
  Mercury, found with ESPRESSO over four years).
- **Wolf 359:** Storms of X-rays and Unconfirmed Worlds (Chandra, 2025).
- **Procyon:** Before the Dog (EarthSky: the name, Canis Minor, the Winter Triangle).
- **Tau Ceti:** Four Proposed Planets (Keck).
- Every neighbouring star now has at least three points of interest, each with at least
  three facts (a test checks this).

## Solar system: checked, unchanged
All other solar-system facts were checked and stand: their figures match NASA and NOAA
(e.g. Mercury's polar ice 0.1–1 trillion tonnes; Olympus Mons ~22 km; the Great Red
Spot's 16,350 km width in 2017 and ~500 km depth from Juno; Parker Solar Probe's
~6.1 million km pass and ~690,000 km/h). Some points of interest cite a mission page
rather than a page about the feature itself (e.g. Valles Marineris → Mariner 9, the ring
arcs → Voyager); the facts hold, but "Learn more" could point somewhere more specific.

## Voyage milestones (added November 2026)
The rings passed on the voyage out to the neighbourhood (`approach` in `src/data/plates.ts`):
- **Voyager 1, about one light-day out** (~173 AU): NASA; the one-light-day crossing is
  expected on 18 November 2026.
- **The Oort Cloud's inner edge, 2,000–5,000 AU; outer edge 10,000–100,000 AU; about 300
  years for Voyager 1 to reach it:** NASA Science, "Oort Cloud: Facts".
- **One light-year = 63,241 AU.**

## The Milky Way (added November 2026)
Every landmark's position is to scale: its distance and galactic longitude and latitude. The
longitudes were computed from each object's catalogued J2000 right ascension and declination
with the IAU galactic rotation, not copied from an encyclopedia.

| Landmark | Distance | Source of distance | l, b (deg) |
|---|---|---|---|
| Sagittarius A* | 27,000 ly; 4 million Suns | ESO eso2208 (EHT) | 359.94, -0.05 |
| Orion Nebula | 1,350 ly | NASA Webb, Orion Bar | 209.01, -19.38 |
| Crab Nebula | 6,500 ly | NASA/JPL Webb release (2023) | 184.56, -5.78 |
| Pillars of Creation (M16) | 6,500 ly | ESA/Webb weic2216 | 16.95, 0.79 |
| Carina Nebula (Cosmic Cliffs) | 7,600 ly | NASA Webb release (2022) | 287.60, -0.63 |
| Omega Centauri | 17,700 ly | STScI/NASA Hubble (2024) | 309.10, 14.97 |

- The galaxy: about 100,000 ly across (NASA, Imagine the Universe); the Sun 27,000 ly from
  the centre (the distance to Sagittarius A*).
- Points of interest cite ESO (EHT), the GRAVITY Collaboration (A&A 2018, S2's 16-year orbit,
  ~120 AU and ~7,650 km/s at its 2018 closest approach), NobelPrize.org (2020 prize), ESA/Webb,
  NASA SVS, NASA Chandra (Crab pulsar's 30 pulses a second; Eta Carinae's 10-45 Suns thrown
  off, its ~90 and ~30 Sun pair, and an older shell from 1200-1800), NASA APOD (the 1054
  guest star as bright as the full Moon; the cloud more than ten light-years across), ESA/
  Hubble (proplyds found 1992), STScI (Omega Centauri's ≥8,200-Sun black hole from 500+
  Hubble images and seven fast stars) and NASA (its ~10 million stars, 10-12 billion years).
- Dropped as unconfirmed by the cited pages: the Crab pulsar's mass and size, Eta Carinae
  becoming the second-brightest star (a popular outlet's claim), and the Trapezium's stars
  carving the nebula.
- The spiral arms are a sketch (said in the intro and credit line): logarithmic spirals fitted
  so the Crab lies on the Perseus Arm, the Eagle and Carina nebulae on the Sagittarius-Carina
  Arm, and the Sun and the Orion Nebula on the Orion Spur; a bar 16,000 ly each way, its near
  end 27 degrees toward positive longitude.
- Voyage milestones: 100 light-years, the Orion Nebula (1,350 ly), 10,000 light-years.

## Still to do
- **Images:** no point of interest has one yet. Each needs a licence check (NASA images
  are generally public domain; ESA/Hubble and ESO are CC BY 4.0) and a credit line.
- Re-check time-sensitive figures yearly: spacecraft distances (Voyager 1 reaches one
  light-day from Earth in November 2026), Europa's shell, exoplanet counts.

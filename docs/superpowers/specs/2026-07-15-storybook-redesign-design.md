# Pa's Place v3 — "A Bedtime Storybook You Scroll Through"

**Date:** 2026-07-15 · **Branch:** `overhaul/v2` · **Status:** approved for build
(autonomous session — the brief in the user's own words: *"unique and warm where it truly
feels like they're looking through children's story/dreams, highly sophisticated graphics
and transitions, breathtaking, works well on mobile and desktop"*)

## Why the v2 design fell short

v2 is a competent warm nonprofit template: sticky header → hero photo → three cards →
marquee → polaroid grid → CTA. Nothing about its *structure* is unique; the warmth is
surface styling. The brief asks for the site itself to feel like paging through a child's
dream — that demands a narrative structure, not a landing-page structure.

## The concept

The homepage **is a picture book**: the story of a child who has never seen the sea,
told in illustrated night-dream pages that you scroll through like turning pages —
until the moment the drawing opens like an iris and becomes a **real film photograph**
of a child meeting the ocean. The dream literally becomes reality on screen, which is
exactly what Pa's Place does for children. The reader is then asked to "help turn the
page" for the next child.

Everything visual derives from the logo: the marigold **sunburst** (the story's sun),
the white **dove** (the story's guide — it flies from scene to scene), warm paper,
and the existing **film photographs** which appear as keepsakes taped into the book
(illustration = the dream, photograph = the reality).

### Approaches considered

- **A. Scroll-driven storybook** (chosen) — narrative chapters, illustrated SVG scenes,
  GSAP scroll choreography, dream→reality reveal. Only option that delivers the brief.
- **B. Scrapbook/collage site** — child-made-scrapbook aesthetic without narrative spine.
  Folded into A (the album spread, tape, handwriting).
- **C. Polish v2 in place** — lowest risk, but the user is "not at all happy"; rejected.

## Aesthetic direction

**Hand-bound bedtime storybook.** Hearty, tactile, read-a-hundred-times — not modern/slick.

- **Night pages** (the dream): deep warm indigo skies, twinkling marigold stars,
  fireflies, a soft moon. New `night` palette family — harmonises with marigold.
- **Day pages** (the reality): existing paper/cream/marigold/bark palette.
- **Linework:** crayon-wobble via SVG `feTurbulence` + `feDisplacementMap` (static filter).
- **Page seams:** torn-paper edges (irregular SVG), replacing generic wave dividers.
- **Photos:** film shots in white keepsake frames with masking-tape corners.
- **Type:** Fraunces Variable (SOFT/WONK — already the storybook serif) for display;
  **Caveat Variable** (new) for handwritten margin notes/captions; Nunito Sans for body.
- **Grain:** keep the film-grain overlay.

## The homepage, scene by scene

1. **Cover — "Far from the sea."** Night sky, parallax stars, moon, silhouetted inland
   hills, one tiny house with a glowing window. CMS `heroTitle` as the book title.
   Handwritten eyebrow. "Begin the story" scroll cue.
2. **The Dream** (pinned + scrubbed): crayon waves roll in layers, a paper boat rides
   them, the dove glides through. "At night, some of them dream of it — a thing they
   know only from stories."
3. **The Journey** (pinned + scrubbed): the sky warms from indigo to paper as the
   sunburst rises; a dashed path draws itself from the little house over green hills to
   a "Pennington, KZN" signpost; the dove flies along the path.
4. **The First Wave** — the reveal. An illustrated shoreline opens through a growing
   torn-edged iris into the real hero photograph. "The greatest joy we witness is a
   child seeing the sea for the very first time."
5. **Days at Pa's Place** — the family album spread. CMS gallery as taped-in keepsakes
   with handwritten captions; horizontal scrub on desktop, natural swipe/stack on mobile.
6. **Three tides of work** — pillars as storybook vignettes with crayon spot art.
7. **Turn the page** — sunset CTA: "For R200 a night…" + sponsor buttons; the dove
   flies off; footer follows as the book's back cover.

## Sub-pages as chapters

- **/our-story — Chapter One:** book-page long-form, drop cap, keepsake photos, pull quote.
- **/what-we-do — Chapter Two:** three offering spreads; "a day moves with the tides" as
  an illustrated sun-arc timeline (sunrise → stars).
- **/get-involved — Chapter Three: How the story continues:** ways-to-help cards
  ("choose your page"), volunteer roles as a handwritten list, back-cover contact.

## Motion system

- **GSAP + ScrollTrigger** (new dep) for pinned/scrubbed scenes, path drawing, iris
  reveal, parallax. All registered through `gsap.matchMedia()`:
  - `(prefers-reduced-motion: reduce)` → no pinning, no scrub; scenes render static
    and complete (content never hidden behind motion).
  - Mobile (`< 768px`) → lighter choreography (fewer parallax layers, shorter pins).
- **CSS ambient loops** (cheap, transform/opacity only): star twinkle, firefly drift,
  boat bob, dove wing-flap, slow sun-ray rotation.
- **Astro ClientRouter** view transitions between pages (soft page-turn fade).
- Micro-interactions: nav underline draw, button press, photo "develop" on hover.

## Technical shape

- Keep: Astro 7 + Tailwind v4 + Keystatic (schema untouched — settings/homepage/gallery
  all still drive content), node adapter, CMS basic-auth middleware, Railway deploy.
- Add deps: `gsap`, `@fontsource-variable/caveat`.
- New/rewritten files:
  - `src/styles/global.css` — rewritten design system (night palette, textures, utilities).
  - `src/layouts/Layout.astro` — fonts, ClientRouter, crayon filter defs.
  - `src/components/story/*` — Dove, Sunburst, TornEdge, Stars, scene components.
  - `src/scripts/storybook.ts` — GSAP choreography for the homepage.
  - `src/components/SiteHeader.astro`, `SiteFooter.astro` — storybook chrome
    (header transparent over the night cover, paper ribbon after scroll).
  - All four pages rewritten/restyled.
- Removed: `WaveDivider.astro` usage at page seams (torn edges instead).

## Accessibility & performance

- Reduced-motion: full static fallback; semantic headings; real HTML text everywhere;
  alt text on all photos; decorative SVG `aria-hidden`; focus-visible states.
- Inline SVG scenes (no network cost), photos via `astro:assets` responsive pipeline,
  GSAP ≈ 60 KB gz total, fonts via fontsource. Scroll animation = transform/opacity only.

## Build steps

1. Deps + design system (global.css, Layout). 2. Shared SVG components.
3. Header/footer. 4. Homepage scenes + choreography. 5. Sub-pages.
6. `npm run build` green; browser-verify desktop (~1440w) + mobile (~390w); polish; commit.

---

## v3.1 rebalance — booking-first (same day, user direction)

The full storybook shipped and was verified, then the brief evolved: keep the
storybook as the base, but **cut the intensity and make booking a stay the
paramount, friction-free path**.

What changed:

- **Ripped out** the pinned Dream and Journey scenes and all scroll-jacking.
  Homepage went from ~13 viewports (4 pins) to ~6 viewports (0 pins).
- **Homepage order now serves utility first:** night cover (with `Book a stay`
  as the primary button) → booking band (`#stay`: price, Call/WhatsApp,
  details link) → mission photo moment → three tides → swipe album → sunset CTA.
- The dream→reality iris survives as a **single play-once CSS transition**
  (IntersectionObserver adds a class; time-based, so it completes even in
  rAF-throttled tabs). **GSAP removed entirely** — the site is pure CSS plus
  ~80 lines of vanilla JS (cover drift, iris trigger, album drag-scroll).
- **New `/book-a-stay` page:** pricing facts from CMS settings, house/coastline
  keepsakes, three-step "how booking works", one-tap Call / WhatsApp / Email,
  address + map, sponsor cross-link.
- Header CTA → `Book a stay`; footer gained a pages column; every "stay"
  mention site-wide routes to `/book-a-stay`.
- Debugging note for posterity: in an occluded browser window Chrome throttles
  rAF to ~0, which starves scrubbed/ticker animations and CSS-transition
  *rendering* — verify end states by forcing frames, and prefer time-based
  CSS transitions for one-shot effects.

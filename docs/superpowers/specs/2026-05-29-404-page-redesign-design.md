# 404 Page Redesign — Halftone Poster

**Date:** 2026-05-29
**Status:** Approved design, pending implementation plan

## Summary

Redesign the application's 404 page (`src/app/not-found.tsx`) into a brutalist-poster
treatment inspired by a red-field halftone "falling figure," while staying inside the
`/impeccable` design system. The page keeps the existing split layout and app chrome
(logo, copy, back-home link) so navigation is preserved, and pairs it with a loud,
constant-red art panel carrying a build-time-generated halftone figure.

The copy stays plain and reuses the existing translation strings. The personality comes
from the layout, the mono typography, and the halftone art — not from the words.

## Goals

- Replace the current static `not-found.avif` art with a striking, vector-crisp halftone
  falling figure.
- Bring poster energy via typography (Geist Mono headline) and a constant red art field.
- Remain theme-aware: the left chrome panel respects light/dark via existing tokens.
- Show the art on mobile (the figure is the point), unlike today's hide-below-`lg`.
- Add a subtle, accessible entrance animation.
- Touch no translation catalogs and no design tokens.

## Non-Goals

- No change to 404 copy/voice (reuse `notFound.*` strings verbatim).
- No new i18n keys; no edits to `en`/`ko`/`zh` catalogs.
- No new design tokens or theme variables.
- No developer-humor "Unhandled Runtime Error" framing (rejected — risks reading as a
  real crash to non-technical users).

## Design Direction

Chosen from three explored options:

- **A — Faithful poster** (full-bleed red always, ignores theme): rejected, too foreign
  to the app shell.
- **B — Theme-aware poster** (whole page adopts poster composition): rejected.
- **C — Split, keeps chrome** (selected): today's split layout reskinned — themed left
  panel + red halftone art panel. Most navigable, least jarring, still delivers the
  poster moment.

## Layout

Two-column grid on `lg` and up; stacked on smaller screens.

### Left chrome panel (themed)

- Parsertime logo at top (existing `/parsertime.png`, `dark:invert`).
- Content block anchored toward the bottom of the panel:
  - Mono eyebrow: `404` (red, Geist Mono, letter-spaced).
  - Headline: **"Page not found"** in **Geist Mono, bold**, tight leading. This is the
    primary poster-DNA carryover.
  - Description: plain sentence, `muted-foreground` token.
  - **← Back to home** link in red.
- Footer: existing **Contact support** link, preserved.
- Background/foreground use existing tokens: `background`, `foreground`,
  `muted-foreground`. Red uses the `--destructive` token family.

### Right art panel (constant red)

- Red field that stays red in both light and dark themes — this is the brand moment.
- Black halftone falling figure rendered from an inlined SVG.
- The art panel is purely decorative: `aria-hidden`, empty `alt` semantics, no text.

### Responsive

- `lg+`: side-by-side (chrome left, art right).
- Below `lg`: stacked, **art on top**, chrome below. (Behavior change: current page hides
  the art entirely below `lg`.)

## Halftone Art Pipeline

### Source

A CC0 / royalty-free falling-figure silhouette or photo. To be sourced during
implementation and committed to the repo (e.g. under `scripts/` inputs or `public/`).
The original source and its license/attribution are recorded alongside the generator.

### Generator

A one-time, re-runnable Node script (in `scripts/`) converts the source raster into an
optimized SVG of luminance-sized dots:

1. Read the source image pixels (e.g. via `sharp`), downsample to a dot grid.
2. For each grid cell, emit a circle whose radius scales with the cell's darkness
   (luminance → dot size), producing a true halftone.
3. Use `fill="currentColor"` on the dots so the figure color can be driven by CSS.
4. Optimize the output (SVGO) and commit the result.

Output is a committed SVG asset. Re-running the script regenerates it deterministically;
it is not generated at request time.

### Rendering

- The SVG is **inlined** into the server component so `currentColor` and CSS animation
  apply. Approach: commit the optimized SVG and inline it (read at the server component
  level, or commit as a small SVG-returning component). Inlining is required to preserve
  `currentColor` and to animate; an `<img>` reference would lose both.
- Payload concern: many small `<circle>` elements compress well under gzip/brotli; SVGO
  plus rounded coordinates keeps it lean. If the inlined size proves excessive, fall back
  to a merged `<path>` of dots or a clipped dot `<pattern>`.

## Motion

CSS-only (no client component; `not-found.tsx` stays an async server component).

- **Figure**: "falls in" on load — from `translateY(-Npx)` + `opacity: 0` to settled,
  ~600–800ms ease-out with a slight settle. Dots fade up.
- **Text**: eyebrow → headline → description perform a short staggered fade/slide-up.
- **Accessibility**: all motion gated behind `@media (prefers-reduced-motion: reduce)` —
  reduced motion shows the final state with no transform (optionally a plain opacity
  fade or nothing).

## Theming

- Left panel: existing tokens only (`background`, `foreground`, `muted-foreground`,
  border tokens as today).
- Red: `--destructive` token family, reused for eyebrow, back-home link, and art field.
- Art panel red is intentionally constant across themes.

## Accessibility

- Art panel is decorative: `aria-hidden="true"`, no meaningful `alt`.
- Heading hierarchy preserved (single `h1` for "Page not found").
- Back-home and Contact support remain keyboard-focusable links with visible focus.
- Color contrast: black dots on red and themed text on themed background meet WCAG AA;
  verify the red link color against both light and dark panel backgrounds.
- Motion respects `prefers-reduced-motion`.

## Files Affected

- `src/app/not-found.tsx` — rewritten layout, mono headline, inlined halftone, motion.
- New: halftone generator script under `scripts/`.
- New: committed source image (CC0) + generated halftone SVG asset.
- New (optional): scoped CSS for keyframes if not expressible via Tailwind utilities.
- Unchanged: `messages/*.json` (no new keys), `globals.css` tokens.

## Testing & Verification

- Visual check in light and dark themes, desktop and mobile widths.
- Verify reduced-motion path (final state, no transform).
- Confirm back-home and contact links navigate correctly.
- Confirm no new translation keys are referenced (reuses `notFound.*`).
- Lighthouse/a11y pass on the route; confirm the inlined SVG payload is reasonable.

## Open Items (resolve during implementation)

- Select and license the specific CC0 falling-figure source image.
- Final dot grid density / circle sizing tuned against the real source.
- Exact location for the committed source input and generated SVG.

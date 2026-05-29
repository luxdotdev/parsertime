# 404 Page Redesign — Halftone Poster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `src/app/not-found.tsx` with a brutalist poster 404 — a themed chrome panel (mono headline, plain copy, back-home link) beside a constant-red art panel showing a build-time-generated halftone of `public/falling.png`, with an accessible CSS entrance animation.

**Architecture:** A pure halftone library (`src/lib/halftone.ts`) converts raw image pixels into luminance-sized dots and renders them as an inline SVG string. A one-time bun script reads `public/falling.png` via `sharp`, runs it through the library, and writes a committed TS module exporting the SVG string. The server component imports that string and inlines it (so `fill="currentColor"` and CSS animation apply). Motion is pure CSS keyframes in `globals.css`, guarded by `prefers-reduced-motion`.

**Tech Stack:** Next.js App Router (async server component), next-intl, Tailwind v4 (CSS `@theme` + keyframes in `globals.css`), `sharp` (image decode), `bun` (script runner), `vitest` (node-env unit tests). Geist Mono via the existing `font-mono` utility.

**Note for executor:** The user does not want the spec/plan markdown committed. Commit only code. The generated `src/app/falling-halftone.ts` IS code and should be committed with its task.

---

## File Structure

- `src/lib/halftone.ts` (new) — pure functions: `luminance`, `sampleDots`, `renderHalftoneSvg`. No I/O. Imported by both the script and tests.
- `test/halftone.test.ts` (new) — vitest unit tests for the library (node env, synthetic pixel buffers).
- `scripts/generate-halftone.ts` (new) — bun script: decode `public/falling.png` with `sharp`, call the library, write the generated module. Re-runnable.
- `src/app/falling-halftone.ts` (generated, committed) — `export const fallingHalftoneSvg = "<svg…>"`.
- `src/app/globals.css` (modify, append) — 404 keyframes + reduced-motion guard.
- `src/app/not-found.tsx` (rewrite) — new layout, inlined halftone, animation classes.
- `public/falling.png` (exists) — source image. No change.

---

## Task 1: Halftone library (pure, TDD)

**Files:**

- Create: `src/lib/halftone.ts`
- Test: `test/halftone.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/halftone.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { luminance, renderHalftoneSvg, sampleDots } from "@/lib/halftone";

describe("luminance", () => {
  it("returns 0 for black and ~1 for white", () => {
    expect(luminance(0, 0, 0)).toBe(0);
    expect(luminance(255, 255, 255)).toBeCloseTo(1, 5);
  });
});

describe("sampleDots", () => {
  const opts = { cols: 2, cell: 10, maxRadius: 1, threshold: 0.5 };

  it("emits a dot for a dark cell and skips light cells", () => {
    // 2x2 RGBA, row-major: top-left black, rest white
    const px = new Uint8Array([
      0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    ]);
    const dots = sampleDots(px, 2, 2, 4, opts);
    expect(dots).toHaveLength(1);
    expect(dots[0].cx).toBe(5);
    expect(dots[0].cy).toBe(5);
    expect(dots[0].r).toBeGreaterThan(0);
  });

  it("skips fully transparent pixels even if dark", () => {
    const px = new Uint8Array([0, 0, 0, 0]); // black but alpha 0
    const dots = sampleDots(px, 1, 1, 4, opts);
    expect(dots).toHaveLength(0);
  });

  it("scales dot radius with darkness", () => {
    const black = new Uint8Array([0, 0, 0, 255]);
    const gray = new Uint8Array([80, 80, 80, 255]);
    const [d1] = sampleDots(black, 1, 1, 4, opts);
    const [d2] = sampleDots(gray, 1, 1, 4, opts);
    expect(d1.r).toBeGreaterThan(d2.r);
  });
});

describe("renderHalftoneSvg", () => {
  it("produces an svg that uses currentColor and circles", () => {
    const svg = renderHalftoneSvg([{ cx: 5, cy: 5, r: 4 }]);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('fill="currentColor"');
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).toContain("<circle");
  });

  it("returns a valid empty svg when there are no dots", () => {
    const svg = renderHalftoneSvg([]);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).not.toContain("<circle");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/halftone.test.ts`
Expected: FAIL — cannot resolve `@/lib/halftone`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/halftone.ts`:

```ts
export type Dot = { cx: number; cy: number; r: number };

export type HalftoneOptions = {
  /** Number of dot columns sampled across the image width. */
  cols: number;
  /** Spacing between dot centers, in SVG units. */
  cell: number;
  /** Max dot radius as a fraction of half the cell (0..1). */
  maxRadius: number;
  /** Luminance (0..1) at/above which a cell is background (no dot). */
  threshold: number;
};

/** Relative luminance 0..1 from 8-bit sRGB channels. */
export function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Sample a raw pixel buffer into halftone dots. Dark, opaque pixels become
 * large dots; pixels lighter than `threshold` (or transparent) become no dot.
 * `channels` is 3 (RGB) or 4 (RGBA).
 */
export function sampleDots(
  pixels: Uint8Array | Buffer,
  width: number,
  height: number,
  channels: number,
  opts: HalftoneOptions
): Dot[] {
  const { cols, cell, maxRadius, threshold } = opts;
  const step = Math.max(1, Math.floor(width / cols)); // source px per cell
  const half = step >> 1;
  const dots: Dot[] = [];

  for (let gy = 0; gy * step < height; gy++) {
    for (let gx = 0; gx * step < width; gx++) {
      const px = Math.min(width - 1, gx * step + half);
      const py = Math.min(height - 1, gy * step + half);
      const i = (py * width + px) * channels;

      const alpha = channels === 4 ? pixels[i + 3] / 255 : 1;
      if (alpha === 0) continue;

      const lum = luminance(pixels[i], pixels[i + 1], pixels[i + 2]);
      if (lum >= threshold) continue;

      const darkness = alpha * (1 - lum); // 0 (light) .. 1 (black)
      const r = darkness * (cell / 2) * maxRadius;
      if (r <= 0) continue;

      dots.push({ cx: gx * cell + cell / 2, cy: gy * cell + cell / 2, r });
    }
  }

  return dots;
}

/** Render dots to an inline SVG string. viewBox is derived from dot extents. */
export function renderHalftoneSvg(dots: Dot[]): string {
  const head = '<svg xmlns="http://www.w3.org/2000/svg"';
  const attrs = 'fill="currentColor" aria-hidden="true"';

  if (dots.length === 0) {
    return `${head} viewBox="0 0 1 1" ${attrs}></svg>`;
  }

  let maxX = 0;
  let maxY = 0;
  for (const d of dots) {
    maxX = Math.max(maxX, d.cx + d.r);
    maxY = Math.max(maxY, d.cy + d.r);
  }

  const circles = dots
    .map(
      (d) =>
        `<circle cx="${round(d.cx)}" cy="${round(d.cy)}" r="${round(d.r)}"/>`
    )
    .join("");

  return `${head} viewBox="0 0 ${round(maxX)} ${round(maxY)}" ${attrs}>${circles}</svg>`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/halftone.test.ts`
Expected: PASS — all 6 assertions green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/halftone.ts test/halftone.test.ts
git commit -m "feat(404): add pure halftone library"
```

---

## Task 2: Halftone generator script + generated artifact

**Files:**

- Create: `scripts/generate-halftone.ts`
- Create (generated, committed): `src/app/falling-halftone.ts`

- [ ] **Step 1: Write the generator script**

Create `scripts/generate-halftone.ts`:

```ts
#!/usr/bin/env bun
import { writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { renderHalftoneSvg, sampleDots } from "../src/lib/halftone";

// Tuning dials — adjust against the real figure, then re-run.
const COLS = 120; // dot columns across the trimmed figure
const CELL = 10; // SVG units between dot centers
const MAX_RADIUS = 0.95; // fraction of half-cell
const THRESHOLD = 0.82; // luminance >= this is background (figure on near-white)

const root = path.resolve(import.meta.dir, "..");
const SRC = path.join(root, "public/falling.png");
const OUT = path.join(root, "src/app/falling-halftone.ts");

// trim() crops the near-white border so the dot grid concentrates on the
// figure; flatten() composites any alpha over white before sampling.
const { data, info } = await sharp(SRC)
  .trim()
  .flatten({ background: "#ffffff" })
  .raw()
  .toBuffer({ resolveWithObject: true });

const dots = sampleDots(data, info.width, info.height, info.channels, {
  cols: COLS,
  cell: CELL,
  maxRadius: MAX_RADIUS,
  threshold: THRESHOLD,
});

const svg = renderHalftoneSvg(dots);

const module = `// GENERATED by scripts/generate-halftone.ts — do not edit by hand.
// Source: public/falling.png. Re-run: bun scripts/generate-halftone.ts
export const fallingHalftoneSvg = ${JSON.stringify(svg)};
`;

writeFileSync(OUT, module);
console.log(`Wrote ${OUT} — ${dots.length} dots, ${svg.length} bytes`);
```

- [ ] **Step 2: Run the generator**

Run: `bun scripts/generate-halftone.ts`
Expected: prints `Wrote .../src/app/falling-halftone.ts — <N> dots, <M> bytes` and creates the file. `N` should be in the low thousands; `M` (string length) should be well under ~200KB. If the figure looks too sparse/dense or the SVG is too large, adjust `COLS`/`THRESHOLD`/`MAX_RADIUS` and re-run.

If `sharp` fails to load under bun in this environment, run with Node instead by temporarily transpiling, or install `tsx` and run `npx tsx scripts/generate-halftone.ts`; the script logic is runner-agnostic. The `import.meta.dir` line is bun-specific — under tsx replace it with `path.dirname(new URL(import.meta.url).pathname)`.

- [ ] **Step 3: Add a smoke test for the generated module**

Append to `test/halftone.test.ts`:

```ts
import { fallingHalftoneSvg } from "@/app/falling-halftone";

describe("generated falling-halftone", () => {
  it("exports a non-trivial inline svg using currentColor", () => {
    expect(fallingHalftoneSvg.startsWith("<svg")).toBe(true);
    expect(fallingHalftoneSvg).toContain('fill="currentColor"');
    expect(fallingHalftoneSvg).toContain("<circle");
    expect(fallingHalftoneSvg.length).toBeGreaterThan(500);
  });
});
```

- [ ] **Step 4: Run the full test file**

Run: `npx vitest run test/halftone.test.ts`
Expected: PASS — the original 6 assertions plus the new smoke test.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-halftone.ts src/app/falling-halftone.ts test/halftone.test.ts
git commit -m "feat(404): generate inline halftone svg from falling.png"
```

---

## Task 3: 404 animation keyframes (with reduced-motion guard)

**Files:**

- Modify: `src/app/globals.css` (append at end of file)

- [ ] **Step 1: Append the keyframes and motion rules**

Add to the end of `src/app/globals.css`:

```css
/* ── 404 / not-found poster ── */
@keyframes not-found-fall {
  from {
    opacity: 0;
    transform: translateY(-2.5rem);
  }
  60% {
    opacity: 1;
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes not-found-rise {
  from {
    opacity: 0;
    transform: translateY(0.75rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.not-found-figure {
  animation: not-found-fall 800ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
.not-found-eyebrow {
  animation: not-found-rise 500ms ease-out 120ms both;
}
.not-found-title {
  animation: not-found-rise 500ms ease-out 200ms both;
}
.not-found-desc {
  animation: not-found-rise 500ms ease-out 300ms both;
}

@media (prefers-reduced-motion: reduce) {
  .not-found-figure,
  .not-found-eyebrow,
  .not-found-title,
  .not-found-desc {
    animation: none;
  }
}
```

- [ ] **Step 2: Verify the stylesheet still compiles**

Run: `npm run build` is heavy; instead rely on the dev server in Task 5. For now, visually scan that braces are balanced and the block is appended after the existing `@keyframes`/reduced-motion sections.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(404): add poster entrance keyframes with reduced-motion guard"
```

---

## Task 4: Rewrite the 404 page

**Files:**

- Rewrite: `src/app/not-found.tsx`

- [ ] **Step 1: Replace the component**

Replace the entire contents of `src/app/not-found.tsx` with:

```tsx
import { Link } from "@/components/ui/link";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { fallingHalftoneSvg } from "./falling-halftone";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="grid min-h-svh grid-rows-[auto_1fr] lg:grid-cols-2 lg:grid-rows-1">
        {/* Art panel — constant red poster. Shown on all sizes; first on mobile. */}
        <div
          aria-hidden="true"
          className="order-first flex min-h-[40svh] items-center justify-center overflow-hidden bg-[#ee1c25] p-8 text-black sm:p-12 lg:order-last lg:min-h-svh"
        >
          <div
            className="not-found-figure w-full max-w-md [&_svg]:h-auto [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: fallingHalftoneSvg }}
          />
        </div>

        {/* Chrome panel — themed. */}
        <div className="flex flex-col p-6 sm:p-10 lg:p-14">
          <Link href="/" className="inline-flex w-fit">
            <span className="sr-only">Parsertime</span>
            <Image
              className="h-10 w-auto sm:h-12 dark:invert"
              src="/parsertime.png"
              alt=""
              width={40}
              height={40}
              priority
            />
          </Link>

          <div className="flex flex-1 flex-col justify-center py-12">
            <div className="max-w-lg">
              <p className="not-found-eyebrow font-mono text-sm font-semibold tracking-[0.15em] text-[#ee1c25]">
                {t("404")}
              </p>
              <h1 className="not-found-title mt-4 font-mono text-4xl font-extrabold tracking-tight sm:text-6xl">
                {t("header")}
              </h1>
              <p className="not-found-desc mt-6 text-base leading-7 text-muted-foreground">
                {t("description")}
              </p>
              <div className="mt-10">
                <Link
                  href="/"
                  className="font-mono text-sm font-semibold text-[#ee1c25]"
                >
                  <span aria-hidden="true">&larr;</span> {t("backHome")}
                </Link>
              </div>
            </div>
          </div>

          <footer className="pt-8 text-sm text-muted-foreground">
            <Link href="/contact">{t("contact")}</Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
```

Notes:

- `font-mono` resolves to Geist Mono via the `--font-mono` token in `globals.css`.
- `#ee1c25` is the constant poster red (eyebrow, back-home link, art field) — matches the reference and stays identical in light/dark by design.
- The art `<div>` is `aria-hidden`; the inlined SVG already carries `aria-hidden` and `currentColor` (the panel's `text-black` colors the dots).
- Reuses the existing `notFound.*` translation keys — no catalog changes.
- `dangerouslySetInnerHTML` is safe here: the markup is a static, build-time-generated SVG committed to the repo (Task 2), never user input — there is no untrusted-content path, so no runtime sanitization is required.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS — no type errors. (`fallingHalftoneSvg` is a typed string export from Task 2.)

- [ ] **Step 3: Commit**

```bash
git add src/app/not-found.tsx
git commit -m "feat(404): redesign not-found page as halftone poster"
```

---

## Task 5: Verification

**Files:** none (validation only)

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: PASS (no new oxlint errors in `src/lib/halftone.ts`, `src/app/not-found.tsx`, `scripts/generate-halftone.ts`).

- [ ] **Step 2: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — including `test/halftone.test.ts`; no regressions elsewhere.

- [ ] **Step 3: Visual check in the running app**

Run: `npm run dev` and visit a non-existent route, e.g. `http://localhost:3000/this-page-does-not-exist`.
Verify:

- Desktop `lg+`: chrome left, red halftone figure right; headline in mono; figure "falls in"; eyebrow/title/description stagger up.
- Toggle theme: left panel flips light/dark, text stays legible, red art panel stays red.
- Narrow the viewport below `lg`: layout stacks with the **figure on top**, chrome below.
- Back-home and Contact support links navigate correctly.

- [ ] **Step 4: Reduced-motion check**

Enable "Reduce motion" (OS setting, or DevTools → Rendering → Emulate `prefers-reduced-motion`), reload the 404.
Expected: content appears in its final state with no fall/rise animation.

- [ ] **Step 5: Final commit (if any tuning changes were made)**

```bash
git add -A
git commit -m "chore(404): tune halftone density and polish"
```

---

## Self-Review

**Spec coverage:**

- Split layout keeping chrome → Task 4. ✓
- Mono headline, plain reused copy → Task 4 (uses `t("header")` etc., `font-mono`). ✓
- Constant red art panel + black halftone figure → Task 4 (`bg-[#ee1c25]`, `text-black`). ✓
- Build-time SVG from a source, `currentColor`, inlined → Tasks 1–2 + 4. ✓
- Auto-trim whitespace around the small figure → Task 2 (`sharp.trim()`). ✓
- Show art on mobile, figure on top → Task 4 (`order-first` / `lg:order-last`). ✓
- CSS-only motion gated by reduced-motion → Task 3 + Task 4 classes. ✓
- No translation or token changes → reuses `notFound.*`; no new `@theme` tokens. ✓
- Theme-aware chrome via tokens → Task 4 (`bg-background`, `text-foreground`, `text-muted-foreground`). ✓
- Accessibility (decorative art, single h1, focusable links) → Task 4. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code; every command has expected output.

**Type consistency:** `Dot`, `HalftoneOptions`, `luminance`, `sampleDots`, `renderHalftoneSvg`, `fallingHalftoneSvg` are named identically across Tasks 1, 2, and 4.

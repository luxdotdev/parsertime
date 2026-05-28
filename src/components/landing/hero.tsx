import Link from 'next/link';
import { SceneHost } from './scene-host';

const sections = [
  {
    label: '01 / start',
    href: '/docs',
    title: 'Collecting and uploading scrim logs',
    meta: 'first scrim',
  },
  {
    label: '02 / read',
    href: '/docs/maps/overview',
    title: 'The map page, end to end',
    meta: '8 tabs',
  },
  {
    label: '03 / rate',
    href: '/docs/tsr/overview',
    title: 'TSR and the tournament ladder',
    meta: 'v3',
  },
  {
    label: '04 / match',
    href: '/docs/matchmaker',
    title: 'Find scrim partners at your bracket',
    meta: 'new',
  },
  {
    label: '05 / chat',
    href: '/docs/ai-chat',
    title: 'AI Analyst, metered by credit',
    meta: 'beta',
  },
];

export function LandingHero() {
  return (
    <section
      aria-labelledby="parsertime-docs-hero-title"
      className="relative isolate min-h-[calc(100vh-3rem)] w-full overflow-hidden"
    >
      {/* Background scene anchored to the right half on desktop, full-bleed on mobile */}
      <div className="absolute inset-0 z-0 lg:left-[42%]">
        <SceneHost />
      </div>

      <div className="pointer-events-none relative z-10 mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-7xl grid-cols-1 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
        <div className="pointer-events-auto flex flex-col justify-between gap-12 px-6 pt-16 pb-12 lg:px-10 lg:pt-20 lg:pb-16">
          {/* Top bracket: doc register + version */}
          <div className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-fd-muted-foreground">
            <span>[01]</span>
            <span
              aria-hidden
              className="block h-px w-6 bg-fd-border"
            />
            <span>docs</span>
            <span aria-hidden className="text-fd-border">·</span>
            <span className="text-fd-foreground/70">parsertime / v3.0</span>
          </div>

          {/* Headline column: quiet and technical */}
          <div className="flex flex-col">
            <h1
              id="parsertime-docs-hero-title"
              className="max-w-[14ch] text-[clamp(2.4rem,4.2vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.025em] text-fd-foreground"
            >
              The reference for v3.
            </h1>

            <p className="mt-6 max-w-[42ch] text-[15px] leading-relaxed text-fd-muted-foreground">
              Every Parsertime surface, written in plain language. From your
              first Workshop log upload to the TSR ladder, the Matchmaker, and
              the AI Analyst. Updated alongside the product.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/docs"
                className="inline-flex h-10 items-center rounded-md bg-fd-primary px-4 text-[13px] font-medium text-fd-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-fd-ring/50"
              >
                Open docs
              </Link>
              <Link
                href="/docs/tsr/overview"
                className="inline-flex h-10 items-center rounded-md border border-fd-border px-4 text-[13px] font-medium text-fd-foreground transition-colors hover:bg-fd-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-fd-ring/50"
              >
                What&rsquo;s new in v3
              </Link>
              <Link
                href="https://parsertime.app"
                className="inline-flex h-10 items-center text-[13px] font-medium text-fd-muted-foreground transition-colors hover:text-fd-foreground"
              >
                parsertime.app &rarr;
              </Link>
            </div>
          </div>

          {/* Sector ribbon: live-looking telemetry instead of platitudes */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-fd-muted-foreground">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block size-1.5 animate-pulse rounded-full bg-fd-primary"
              />
              <span>rec · live</span>
            </div>
            <div className="flex items-center gap-2">
              <span aria-hidden className="h-px w-6 bg-fd-border" />
              <span className="tabular-nums">51 pages</span>
            </div>
            <div className="flex items-center gap-2">
              <span aria-hidden className="h-px w-6 bg-fd-border" />
              <span className="tabular-nums">v3.0 · 2026.05</span>
            </div>
          </div>
        </div>

        <div aria-hidden className="hidden lg:block" />
      </div>
    </section>
  );
}

export function LandingIndex() {
  return (
    <section
      aria-label="Parsertime documentation index"
      className="border-t border-fd-border bg-fd-background"
    >
      <div className="mx-auto w-full max-w-7xl px-6 py-14 lg:px-10 lg:py-20">
        <div className="mb-10 flex items-end justify-between gap-6 border-b border-fd-border pb-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-fd-muted-foreground">
            Index
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-fd-muted-foreground tabular-nums">
            05 picks
          </span>
        </div>

        <ul className="flex flex-col">
          {sections.map((s) => (
            <li key={s.label}>
              <Link
                href={s.href}
                className="group grid grid-cols-[160px_1fr_auto] items-baseline gap-x-6 border-b border-fd-border/60 py-5 text-fd-foreground transition-colors hover:bg-fd-muted/40"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-fd-muted-foreground transition-colors group-hover:text-fd-primary">
                  {s.label}
                </span>
                <span className="text-[15px] font-medium">{s.title}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fd-muted-foreground tabular-nums">
                  {s.meta}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

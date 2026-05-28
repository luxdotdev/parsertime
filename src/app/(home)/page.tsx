import Link from 'next/link';

const sections = [
  {
    label: 'Start',
    items: [
      { href: '/docs', title: 'Upload your first scrim', meta: '3 min' },
      { href: '/docs', title: 'Read the per-player dashboard', meta: '5 min' },
      { href: '/docs', title: 'Make sense of CSR', meta: '8 min' },
    ],
  },
  {
    label: 'Reference',
    items: [
      { href: '/docs', title: 'Stat dimensions', meta: '08' },
      { href: '/docs', title: 'Workshop log format', meta: 'spec' },
      { href: '/docs', title: 'Team and access model', meta: 'v3' },
    ],
  },
  {
    label: 'Release',
    items: [
      { href: '/docs', title: 'What changed in v3', meta: 'May 2026' },
      { href: '/docs', title: 'Migration from v2', meta: 'guide' },
      { href: '/docs', title: 'Changelog', meta: 'live' },
    ],
  },
];

export default function HomePage() {
  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-5xl px-6 pt-16 pb-24 md:pt-24">
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-fd-muted-foreground">
          <span className="inline-block size-1.5 rounded-full bg-fd-primary" />
          <span>Parsertime docs</span>
          <span className="text-fd-border">/</span>
          <span>v3.0</span>
          <span className="text-fd-border">/</span>
          <span className="tabular-nums">2026.05</span>
        </div>

        <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.05] tracking-[-0.02em] md:text-5xl">
          The coach&rsquo;s reference for Overwatch&nbsp;2 scrim data.
        </h1>

        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-fd-muted-foreground">
          How CSR is computed, how the eight dashboards read, what the v3 upload
          pipeline changes, and how to wire access for your roster. Written for
          analysts at 10pm ET, after the scrim block.
        </p>

        <div className="mt-8 flex items-center gap-3">
          <Link
            href="/docs"
            className="inline-flex h-9 items-center rounded-md bg-fd-primary px-3.5 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-fd-ring/50"
          >
            Open docs
          </Link>
          <Link
            href="/docs"
            className="inline-flex h-9 items-center rounded-md border border-fd-border px-3.5 text-sm font-medium text-fd-foreground transition-colors hover:bg-fd-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-fd-ring/50"
          >
            What&rsquo;s new in v3
          </Link>
        </div>

        <div className="mt-16 border-t border-fd-border">
          {sections.map((section) => (
            <div
              key={section.label}
              className="grid grid-cols-1 gap-y-2 border-b border-fd-border py-6 md:grid-cols-[160px_1fr] md:gap-x-10 md:py-7"
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-fd-muted-foreground md:pt-[2px]">
                {section.label}
              </div>
              <ul className="flex flex-col divide-y divide-fd-border/60">
                {section.items.map((item) => (
                  <li key={item.title}>
                    <Link
                      href={item.href}
                      className="group flex items-baseline justify-between gap-6 py-2.5 text-[15px] text-fd-foreground transition-colors hover:text-fd-primary"
                    >
                      <span className="font-medium">{item.title}</span>
                      <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.12em] text-fd-muted-foreground tabular-nums transition-colors group-hover:text-fd-primary/80">
                        {item.meta}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-fd-muted-foreground md:flex-row md:items-center md:gap-6">
          <span>78% desktop &middot; tuned for 27&Prime; monitors</span>
          <span className="hidden text-fd-border md:inline">/</span>
          <span>
            Late-night sessions &middot; reduced motion honored
          </span>
        </div>
      </div>
    </main>
  );
}

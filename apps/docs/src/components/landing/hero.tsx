import { getLatestUpdate } from "@/lib/edge-updates";
import Link from "next/link";
import { SceneHost } from "./scene-host";

const changelog = [
  {
    tag: "new · rating",
    title: "TSR, the tournament ladder",
    href: "/docs/tsr/overview",
    body: (
      <>
        Per-player rating grounded in FACEIT-hosted Overwatch 2 tournament
        results. Two regional ladders, a max-tier prior, a 365-day half-life,
        and a soft cap above 4000. Sits beside CSR, not on top of it.
      </>
    ),
    meta: "1 to 5000",
  },
  {
    tag: "new · match",
    title: "Matchmaker",
    href: "/docs/matchmaker",
    body: (
      <>
        Find scrim partners at your team&rsquo;s bracket. Requests deliver to
        the other team&rsquo;s Discord through the Parsertime bot. 24-hour
        cooldown per target, 10 requests per team per day.
      </>
    ),
    meta: "na / emea",
  },
  {
    tag: "updated · billing",
    title: "AI Analyst on credits",
    href: "/docs/ai-chat",
    body: (
      <>
        Pay-as-you-go billing replaced with a prepaid credit balance. Top up in
        $5 / $10 / $25 / $50 increments, or turn on auto-refill. Per-token rates
        and the live balance sit in the chat header.
      </>
    ),
    meta: "stripe",
  },
  {
    tag: "new · telemetry",
    title: "Player telemetry",
    href: "/docs/maps/telemetry",
    body: (
      <>
        A per-player tab modeled on F1 telemetry: damage by target, opponent
        matchup radar, focus fire by role, ult combos and counter-ult response,
        ultimate advantage per fight.
      </>
    ),
    meta: "per player",
  },
  {
    tag: "new · personal",
    title: "Ranked tracker",
    href: "/docs/ranked/overview",
    body: (
      <>
        A personal dashboard for your own competitive ladder. Log or bulk-import
        games and get win rate over time, best heroes and maps, results by role
        and group size, and per-patch impact. Private by default, with an opt-in
        public summary.
      </>
    ),
    meta: "per player",
  },
  {
    tag: "new · analysis",
    title: "Match Story",
    href: "/docs/maps/match-story",
    body: (
      <>
        A win-probability model reads each map as a narrative: a sortable fight
        ledger with the swing of every fight, driver-aware takeaways that say
        why it moved, and a missed-opportunities pass on the leads you let slip.
      </>
    ),
    meta: "per map",
  },
  {
    tag: "new · scouting",
    title: "FACEIT Scouting",
    href: "/docs/scouting/overview",
    body: (
      <>
        Scout FACEIT teams and players ahead of a match: map and ban tendencies,
        attack/defense splits, rosters, and FSR &mdash; a tier- and role-aware
        skill rating that grades a player against their peers.
      </>
    ),
    meta: "premium",
  },
  {
    tag: "new · spatial",
    title: "Positional analytics",
    href: "/docs/maps/routes",
    body: (
      <>
        Movement data turned into insight: route maps, fight-initiation grading,
        zone control, and a positioning profile per player &mdash; on the map
        page, the team stats page, and the scrim overview.
      </>
    ),
    meta: "positional",
  },
];

const quickstart = [
  {
    n: "01",
    title: "Collect Workshop logs",
    body: (
      <>
        In Overwatch 2, enable{" "}
        <em className="text-fd-foreground not-italic">
          Gameplay &rarr; Workshop Inspector Log File
        </em>
        . Host a custom lobby with workshop code{" "}
        <code className="bg-fd-muted text-fd-foreground rounded-sm px-1.5 py-0.5 font-mono text-[12px]">
          Z0ASA
        </code>
        . Logs land in your{" "}
        <code className="bg-fd-muted text-fd-foreground rounded-sm px-1.5 py-0.5 font-mono text-[12px]">
          Documents/Overwatch/Workshop
        </code>{" "}
        folder.
      </>
    ),
    href: "/docs#collecting-scrim-logs",
  },
  {
    n: "02",
    title: "Upload your first scrim",
    body: (
      <>
        From the dashboard, click{" "}
        <em className="text-fd-foreground not-italic">Create Scrim</em>, name
        it, assign a team, and drop in the logs for the first map. The rest of
        the maps can be added incrementally. Delete any log under 1KB before
        uploading; those are partial captures.
      </>
    ),
    href: "/docs/scrims",
  },
  {
    n: "03",
    title: "Read the map page",
    body: (
      <>
        Over a dozen tabs cover the read &mdash; Overview, Killfeed, Charts,
        Match Story, Heatmap, Replay, Routes, Events, and Initiation among them.
        Tabular numerals throughout, dense enough for a 27&Prime; monitor,
        sortable everywhere. Compare scrims side by side from any map.
      </>
    ),
    href: "/docs/maps/overview",
  },
];

const indexGroups = [
  {
    label: "Setup",
    pages: [
      { title: "Introduction", href: "/docs" },
      { title: "Dashboard", href: "/docs/dashboard" },
      { title: "Teams", href: "/docs/teams" },
      { title: "Scrims", href: "/docs/scrims" },
      { title: "Discord bot", href: "/docs/discord-bot" },
    ],
  },
  {
    label: "Pages",
    pages: [
      { title: "Maps", href: "/docs/maps" },
      { title: "Stats", href: "/docs/stats" },
      { title: "Team Stats", href: "/docs/team-stats" },
      { title: "Profile", href: "/docs/profile" },
      { title: "Ranked", href: "/docs/ranked/overview" },
    ],
  },
  {
    label: "Ratings",
    pages: [
      { title: "CSR overview", href: "/docs/csr/overview" },
      { title: "CSR leaderboard", href: "/docs/csr/leaderboard" },
      { title: "TSR overview", href: "/docs/tsr/overview" },
      { title: "TSR leaderboard", href: "/docs/tsr/leaderboard" },
      { title: "Team TSR", href: "/docs/tsr/team-tsr" },
    ],
  },
  {
    label: "Tools",
    pages: [
      { title: "Matchmaker", href: "/docs/matchmaker" },
      { title: "Scouting", href: "/docs/scouting/overview" },
      { title: "AI Analyst", href: "/docs/ai-chat" },
      { title: "Coaching Canvas", href: "/docs/coaching-canvas" },
      { title: "Availability", href: "/docs/availability" },
    ],
  },
  {
    label: "Account",
    pages: [
      { title: "Settings", href: "/docs/settings/overview" },
      { title: "Billing", href: "/docs/settings/billing" },
      { title: "Linked accounts", href: "/docs/settings/linked-accounts" },
      { title: "Reporting bugs", href: "/docs/reporting-bugs" },
      { title: "Known issues", href: "/docs/known-issues" },
    ],
  },
];

export async function LandingHero() {
  const latestUpdate = await getLatestUpdate();

  return (
    <section
      aria-labelledby="parsertime-docs-hero-title"
      className="relative isolate w-full overflow-hidden lg:min-h-[calc(100vh-3rem)]"
    >
      {/*
       * Mobile: text stacks above the sigil (single grid column). The sigil
       * gets a constrained-height row so it reads as a hero visual without
       * crashing into the headline.
       * Desktop: two columns side by side, sigil fills the right half edge to
       * edge, no absolute positioning needed.
       */}
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 lg:h-[calc(100vh-3rem)] lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
        <div className="flex flex-col justify-between gap-10 px-6 pt-12 pb-8 lg:gap-12 lg:px-10 lg:pt-20 lg:pb-16">
          {/* Top bracket: doc register + version */}
          <div className="text-fd-muted-foreground flex items-center gap-2.5 font-mono text-[11px] tracking-[0.22em] uppercase">
            <span>[01]</span>
            <span aria-hidden className="bg-fd-border block h-px w-6" />
            <span>docs</span>
            <span aria-hidden className="text-fd-border">
              ·
            </span>
            <span className="text-fd-foreground/70">parsertime / v3.0</span>
          </div>

          {/* Headline column: quiet and technical */}
          <div className="flex flex-col">
            <Link
              href={latestUpdate.url}
              className="group border-fd-border bg-fd-card/60 hover:border-fd-foreground/25 hover:bg-fd-muted/70 mb-6 inline-flex items-center gap-2.5 self-start rounded-full border py-1 pr-3.5 pl-1 text-[12px] backdrop-blur-sm transition-colors"
            >
              <span className="bg-fd-primary text-fd-primary-foreground rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                Latest updates
              </span>
              <span className="text-fd-muted-foreground group-hover:text-fd-foreground transition-colors">
                {latestUpdate.title}
              </span>
              <span
                aria-hidden
                className="text-fd-muted-foreground/70 transition-transform group-hover:translate-x-0.5"
              >
                &rarr;
              </span>
            </Link>

            <h1
              id="parsertime-docs-hero-title"
              className="text-fd-foreground max-w-[14ch] text-[clamp(2.4rem,4.2vw,3.6rem)] leading-[1.02] font-bold tracking-[-0.025em]"
            >
              The reference for v3.
            </h1>

            <p className="text-fd-muted-foreground mt-6 max-w-[42ch] text-[15px] leading-relaxed">
              Every Parsertime surface, written in plain language. From your
              first Workshop log upload to the TSR ladder, the Matchmaker, Match
              Story, and the Ranked tracker. Updated alongside the product.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/docs"
                className="bg-fd-primary text-fd-primary-foreground focus-visible:ring-fd-ring/50 inline-flex h-10 items-center rounded-md px-4 text-[13px] font-medium transition-opacity hover:opacity-90 focus-visible:ring-[3px] focus-visible:outline-none"
              >
                Open docs
              </Link>
              <Link
                href="/docs/tsr/overview"
                className="border-fd-border text-fd-foreground hover:bg-fd-muted focus-visible:ring-fd-ring/50 inline-flex h-10 items-center rounded-md border px-4 text-[13px] font-medium transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
              >
                What&rsquo;s new in v3
              </Link>
              <Link
                href="https://parsertime.app"
                className="text-fd-muted-foreground hover:text-fd-foreground inline-flex h-10 items-center text-[13px] font-medium transition-colors"
              >
                parsertime.app &rarr;
              </Link>
            </div>
          </div>

          {/* Sector ribbon: live-looking telemetry instead of platitudes */}
          <div className="text-fd-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] tracking-[0.22em] uppercase">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="bg-fd-primary inline-block size-1.5 animate-pulse rounded-full"
              />
              <span>rec · live</span>
            </div>
            <div className="flex items-center gap-2">
              <span aria-hidden className="bg-fd-border h-px w-6" />
              <span className="tabular-nums">65 pages</span>
            </div>
            <div className="flex items-center gap-2">
              <span aria-hidden className="bg-fd-border h-px w-6" />
              <span className="tabular-nums">v3.0 · 2026.06</span>
            </div>
          </div>
        </div>

        {/* Sigil column. Tall enough on mobile to read as a hero, full
            column on desktop. The wrapper div is what r3f Canvas fills. */}
        <div className="relative h-[55vh] min-h-[360px] w-full lg:h-auto lg:min-h-0">
          <SceneHost />
        </div>
      </div>
    </section>
  );
}

/* --- shared section header --- */

function SectionHeader({
  eyebrow,
  title,
  meta,
  description,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
  description?: React.ReactNode;
}) {
  return (
    <div className="border-fd-border mb-12 border-b pb-6">
      <div className="flex items-end justify-between gap-6">
        <div className="text-fd-muted-foreground flex items-center gap-2.5 font-mono text-[11px] tracking-[0.22em] uppercase">
          <span aria-hidden className="bg-fd-border block h-px w-6" />
          <span>{eyebrow}</span>
        </div>
        {meta && (
          <span className="text-fd-muted-foreground font-mono text-[10px] tracking-[0.22em] uppercase tabular-nums">
            {meta}
          </span>
        )}
      </div>
      <h2 className="text-fd-foreground mt-5 max-w-[28ch] text-[clamp(1.6rem,2.4vw,2.1rem)] leading-[1.1] font-bold tracking-[-0.02em]">
        {title}
      </h2>
      {description && (
        <p className="text-fd-muted-foreground mt-3 max-w-[58ch] text-[14px] leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}

/* --- changelog: 2x2 dense grid of substantive v3 highlights --- */

export function LandingChangelog() {
  return (
    <section
      aria-labelledby="landing-changelog"
      className="border-fd-border bg-fd-background border-t"
    >
      <div className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-10 lg:py-24">
        <div id="landing-changelog">
          <SectionHeader
            eyebrow="02 · changelog"
            title="What landed in v3."
            meta="2026.06"
            description="The TSR ladder and Matchmaker, a credit-based AI Analyst, win-probability Match Story, a personal Ranked tracker, FACEIT Scouting, and a full positional-analytics suite. The rest of v3 is hundreds of smaller polish passes; these are the eight worth reading the docs for."
          />
        </div>

        <div className="bg-fd-border grid grid-cols-1 gap-px lg:grid-cols-2">
          {changelog.map((item) => (
            <Link
              key={item.tag}
              href={item.href}
              className="group bg-fd-background hover:bg-fd-muted/30 relative flex flex-col gap-5 p-7 transition-colors lg:p-9"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="text-fd-primary font-mono text-[11px] tracking-[0.18em] uppercase">
                  {item.tag}
                </span>
                <span className="text-fd-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase tabular-nums">
                  {item.meta}
                </span>
              </div>
              <h3 className="text-fd-foreground text-[20px] leading-[1.2] font-semibold tracking-[-0.01em]">
                {item.title}
              </h3>
              <p className="text-fd-muted-foreground text-[14px] leading-relaxed">
                {item.body}
              </p>
              <span className="text-fd-foreground group-hover:text-fd-primary mt-auto inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors">
                Read more
                <span
                  aria-hidden
                  className="transition-transform group-hover:translate-x-0.5"
                >
                  &rarr;
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --- quickstart: three steps with embedded mono snippets --- */

export function LandingQuickstart() {
  return (
    <section
      aria-labelledby="landing-quickstart"
      className="border-fd-border bg-fd-muted/30 border-t"
    >
      <div className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-10 lg:py-24">
        <div id="landing-quickstart">
          <SectionHeader
            eyebrow="03 · start"
            title="From log file to dashboard in three steps."
            meta="≈ 3 min"
            description="Most coaches do this once per team, then never think about it again. Per-scrim, you just drag a folder onto the upload dialog."
          />
        </div>

        <ol className="bg-fd-border grid grid-cols-1 gap-px lg:grid-cols-3">
          {quickstart.map((step) => (
            <li
              key={step.n}
              className="bg-fd-background flex flex-col gap-5 p-7 lg:p-8"
            >
              <div className="flex items-baseline gap-4">
                <span className="text-fd-primary font-mono text-[32px] leading-none font-medium tabular-nums">
                  {step.n}
                </span>
                <span className="text-fd-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
                  step
                </span>
              </div>
              <h3 className="text-fd-foreground text-[18px] leading-[1.25] font-semibold tracking-[-0.01em]">
                {step.title}
              </h3>
              <p className="text-fd-muted-foreground text-[14px] leading-[1.65]">
                {step.body}
              </p>
              <Link
                href={step.href}
                className="text-fd-foreground hover:text-fd-primary mt-auto inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors"
              >
                Read the full guide
                <span aria-hidden>&rarr;</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* --- browse-all: grouped index, dense table-of-contents layout --- */

export function LandingBrowse() {
  return (
    <section
      aria-labelledby="landing-browse"
      className="border-fd-border bg-fd-background border-t"
    >
      <div className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-10 lg:py-24">
        <div id="landing-browse">
          <SectionHeader
            eyebrow="04 · index"
            title="The full reference."
            meta="65 pages"
            description="Grouped by what you tend to be looking for. The sidebar inside /docs carries the same structure."
          />
        </div>

        <div className="grid grid-cols-1 gap-y-12 lg:grid-cols-[160px_1fr] lg:gap-x-12">
          {indexGroups.flatMap((group) => [
            <h3
              key={`h-${group.label}`}
              className="text-fd-muted-foreground font-mono text-[11px] tracking-[0.22em] uppercase lg:pt-1"
            >
              {group.label}
            </h3>,
            <ul
              key={`u-${group.label}`}
              className="grid grid-cols-1 gap-y-1 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-6"
            >
              {group.pages.map((p) => (
                <li key={p.href}>
                  <Link
                    href={p.href}
                    className="group border-fd-border/60 text-fd-foreground hover:text-fd-primary flex items-baseline justify-between gap-3 border-b py-2.5 text-[14px] transition-colors"
                  >
                    <span>{p.title}</span>
                    <span
                      aria-hidden
                      className="text-fd-muted-foreground group-hover:text-fd-primary font-mono text-[11px] transition-all group-hover:translate-x-0.5"
                    >
                      &rarr;
                    </span>
                  </Link>
                </li>
              ))}
            </ul>,
          ])}
        </div>

        <div className="border-fd-border text-fd-muted-foreground mt-16 flex flex-wrap items-center justify-between gap-y-3 border-t pt-6 font-mono text-[11px] tracking-[0.18em] uppercase">
          <span>parsertime docs · v3.0</span>
          <div className="flex items-center gap-4">
            <Link
              href="https://parsertime.app"
              className="hover:text-fd-foreground transition-colors"
            >
              parsertime.app &rarr;
            </Link>
            <Link
              href="https://discord.gg/svz3qhVDXM"
              className="hover:text-fd-foreground transition-colors"
            >
              discord &rarr;
            </Link>
            <Link
              href="https://github.com/lucasdoell/parsertime-docs"
              className="hover:text-fd-foreground transition-colors"
            >
              github &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

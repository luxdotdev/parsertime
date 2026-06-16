import { TeamSelector } from "@/components/stats/team/selector";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Effect } from "effect";
import { redirect } from "next/navigation";

const SURFACES: { label: string; summary: string }[] = [
  {
    label: "Overview",
    summary:
      "Last-10 record, best day of the week, average fight length, first-pick rate, and a role-balance radar. The single screen for a quick read.",
  },
  {
    label: "Performance",
    summary:
      "Per-role splits with K/D, ult efficiency, damage and healing per 10. Surfaces the role trios that actually win games.",
  },
  {
    label: "Heroes",
    summary:
      "Hero pool depth, win rate by hero, pickrate heatmap by player and map. Across any timeframe.",
  },
  {
    label: "Trends",
    summary:
      "Week-over-week and monthly win rate, recent form, win and loss streaks. Trajectory, not just totals.",
  },
  {
    label: "Maps",
    summary:
      "Win rate by mode and by map, with a per-player matrix so map specialists are visible at a glance.",
  },
  {
    label: "Teamfights",
    summary:
      "Fight win rate, ult economy, dry-fight frequency, and the conditions that flip a fight outcome.",
  },
];

export default async function TeamStatsPage() {
  const session = await auth();
  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session?.user.email)))
  );
  if (!user) redirect("/sign-in");

  const teams = await prisma.team.findMany({
    where: {
      users: {
        some: { id: user.id },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border border-b pb-6">
        <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
          Team analytics
        </p>
        <h1 className="mt-3 text-4xl leading-none font-semibold tracking-tight">
          Team stats
        </h1>
        <p className="text-muted-foreground mt-3 max-w-prose text-sm leading-relaxed">
          Pick a team and read how it&apos;s playing. Six surfaces answer the
          questions a coach asks between scrim and review.
        </p>
      </header>

      <div className="mt-2 divide-y divide-[var(--border)]">
        <section className="grid gap-x-10 gap-y-6 py-10 sm:py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              Selection · Start here
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              Which team to read?
            </h2>
            <p className="text-muted-foreground mt-3 font-mono text-xs tracking-wider">
              Only teams you&apos;re a member of.
            </p>

            <div className="mt-6 max-w-md">
              <TeamSelector teams={teams} />
            </div>
          </div>

          <div className="space-y-6">
            <dl className="border-border flex flex-wrap items-baseline gap-x-8 gap-y-2 border-b pb-4 font-mono">
              <div className="flex flex-col">
                <dt className="text-muted-foreground text-[10px] tracking-[0.18em] uppercase">
                  Your teams
                </dt>
                <dd className="text-lg font-medium tabular-nums">
                  {teams.length}
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-muted-foreground text-[10px] tracking-[0.18em] uppercase">
                  Surfaces
                </dt>
                <dd className="text-lg font-medium tabular-nums">6</dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-muted-foreground text-[10px] tracking-[0.18em] uppercase">
                  Refresh
                </dt>
                <dd className="text-lg font-medium">As scrims upload</dd>
              </div>
            </dl>

            <div>
              <p className="text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase">
                What you&apos;re reading
              </p>
              <p className="text-foreground mt-2 text-sm leading-relaxed">
                Aggregations across every scrim a team has uploaded. Player
                performance rolls up into role splits, hero pools, win rate
                trends, and a fight-by-fight breakdown of how the team wins or
                loses team fights.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <BulletGroup
                label="Reaches for"
                tone="foreground"
                items={[
                  "Team-level patterns players miss",
                  "Practice priorities by map and mode",
                  "Composition signal across scrims",
                ]}
              />
              <BulletGroup
                label="Doesn't capture"
                tone="muted"
                items={[
                  "Opponent strength",
                  "Tournament-tier matchups",
                  "Hero-specific peer comparison (see CSR)",
                ]}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-x-10 gap-y-6 py-10 sm:py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              Surfaces · Six tabs
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              What lives on each tab
            </h2>
            <p className="text-muted-foreground mt-3 font-mono text-xs tracking-wider">
              Same data, six framings.
            </p>
          </div>

          <dl className="divide-y divide-[var(--border)]">
            {SURFACES.map((s) => (
              <div
                key={s.label}
                className="grid gap-x-6 gap-y-1 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,2.5fr)]"
              >
                <dt className="text-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
                  {s.label}
                </dt>
                <dd className="text-muted-foreground text-sm leading-relaxed">
                  {s.summary}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}

function BulletGroup({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: "foreground" | "muted";
}) {
  return (
    <div>
      <p className="text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase">
        {label}
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li
            key={item}
            className={
              tone === "foreground"
                ? "text-foreground text-sm leading-relaxed"
                : "text-muted-foreground text-sm leading-relaxed"
            }
          >
            <span
              aria-hidden
              className="text-muted-foreground/70 mr-2 font-mono text-xs"
            >
              ·
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

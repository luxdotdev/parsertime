import { Button } from "@/components/ui/button";
import {
  type LeaderboardMetric,
  LEADERBOARD_METRICS,
} from "@/lib/leaderboard/registry";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

export type MetricStats = {
  /** Two or three eyebrow stat pairs to render in the per-metric ribbon. */
  ribbon: { label: string; value: string }[];
  /** A one-line "current state" line shown beneath the derivation. */
  status?: string;
};

type Props = {
  statsById: Partial<Record<LeaderboardMetric["id"], MetricStats>>;
};

export function LeaderboardHub({ statsById }: Props) {
  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border border-b pb-6">
        <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
          Leaderboard
        </p>
        <h1 className="mt-3 text-4xl leading-none font-semibold tracking-tight">
          Skill ratings
        </h1>
        <p className="text-muted-foreground mt-3 max-w-prose text-sm leading-relaxed">
          Player skill is measured more than one way. Pick the question
          you&apos;re answering and read the board that fits.
        </p>
      </header>

      <div className="mt-2 divide-y divide-[var(--border)]">
        {LEADERBOARD_METRICS.map((m, i) => (
          <MetricSection
            key={m.id}
            metric={m}
            stats={statsById[m.id]}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}

function MetricSection({
  metric,
  stats,
  index,
}: {
  metric: LeaderboardMetric;
  stats?: MetricStats;
  index: number;
}) {
  return (
    <section
      className="grid gap-x-10 gap-y-6 py-10 sm:py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div>
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {metric.shortLabel} · Answers
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">
          {metric.question}
        </h2>
        {stats?.status ? (
          <p className="text-muted-foreground mt-3 font-mono text-xs tracking-wider">
            {stats.status}
          </p>
        ) : null}

        <Button asChild size="sm" className="mt-6 h-9 rounded-md px-3 text-sm">
          <Link href={metric.href}>
            Browse {metric.fullName}
            <ArrowRightIcon className="ml-1.5 size-3.5" aria-hidden />
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        {stats?.ribbon && stats.ribbon.length > 0 ? (
          <dl className="border-border flex flex-wrap items-baseline gap-x-8 gap-y-2 border-b pb-4 font-mono">
            {stats.ribbon.map((s) => (
              <div key={s.label} className="flex flex-col">
                <dt className="text-muted-foreground text-[10px] tracking-[0.18em] uppercase">
                  {s.label}
                </dt>
                <dd className="text-lg font-medium tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div>
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase">
            How it&apos;s computed
          </p>
          <p className="text-foreground mt-2 text-sm leading-relaxed">
            {metric.derivation}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <BulletGroup
            label="Reaches for"
            items={metric.strengths}
            tone="foreground"
          />
          <BulletGroup
            label="Doesn't capture"
            items={metric.caveats}
            tone="muted"
          />
        </div>
      </div>
    </section>
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

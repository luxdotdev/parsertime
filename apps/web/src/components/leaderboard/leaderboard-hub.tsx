import { Button } from "@/components/ui/button";
import {
  type LeaderboardMetric,
  LEADERBOARD_METRICS,
} from "@/lib/leaderboard/registry";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("leaderboardPage.hub");

  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border border-b pb-6">
        <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="mt-3 text-4xl leading-none font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-prose text-sm leading-relaxed">
          {t("description")}
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
  const t = useTranslations("leaderboardPage.hub");
  const copy = getMetricCopy(metric.id, t);

  return (
    <section
      className="grid gap-x-10 gap-y-6 py-10 sm:py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div>
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {t("answersEyebrow", { metric: copy.shortLabel })}
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">
          {copy.question}
        </h2>
        {stats?.status ? (
          <p className="text-muted-foreground mt-3 font-mono text-xs tracking-wider">
            {stats.status}
          </p>
        ) : null}

        <Button asChild size="sm" className="mt-6 h-9 rounded-md px-3 text-sm">
          <Link href={metric.href}>
            {t("browse", { metric: copy.fullName })}
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
            {t("computed")}
          </p>
          <p className="text-foreground mt-2 text-sm leading-relaxed">
            {copy.derivation}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <BulletGroup
            label={t("reachesFor")}
            items={copy.strengths}
            tone="foreground"
          />
          <BulletGroup
            label={t("doesNotCapture")}
            items={copy.caveats}
            tone="muted"
          />
        </div>
      </div>
    </section>
  );
}

function getMetricCopy(
  id: LeaderboardMetric["id"],
  t: ReturnType<typeof useTranslations>
) {
  switch (id) {
    case "csr":
      return {
        shortLabel: "CSR",
        fullName: t("metrics.csr.fullName"),
        question: t("metrics.csr.question"),
        derivation: t("metrics.csr.derivation"),
        strengths: [
          t("metrics.csr.strengths.heroSpecific"),
          t("metrics.csr.strengths.scrimExecution"),
          t("metrics.csr.strengths.fastUpdates"),
        ],
        caveats: [
          t("metrics.csr.caveats.opponentStrength"),
          t("metrics.csr.caveats.minimumSample"),
        ],
      };
    case "tsr":
      return {
        shortLabel: "TSR",
        fullName: t("metrics.tsr.fullName"),
        question: t("metrics.tsr.question"),
        derivation: t("metrics.tsr.derivation"),
        strengths: [
          t("metrics.tsr.strengths.headToHead"),
          t("metrics.tsr.strengths.comparable"),
          t("metrics.tsr.strengths.currentForm"),
        ],
        caveats: [
          t("metrics.tsr.caveats.faceitOnly"),
          t("metrics.tsr.caveats.battleTag"),
        ],
      };
  }
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

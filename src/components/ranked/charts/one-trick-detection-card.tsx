"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ONE_TRICK_THRESHOLD,
  SPECIALIST_THRESHOLD,
  type OneTrickResult,
} from "@/lib/ranked-stats";

type OneTrickDetectionCardProps = {
  result: OneTrickResult;
};

const LABEL_STYLES: Record<
  OneTrickResult["label"],
  { bg: string; text: string }
> = {
  "One-Trick": {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
  },
  Specialist: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
  },
  Diverse: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
  },
};

const ROLE_COLORS: Record<string, string> = {
  Tank: "oklch(0.65 0.18 250)",
  Damage: "oklch(0.65 0.18 25)",
  Support: "oklch(0.65 0.18 160)",
};

export function OneTrickDetectionCard({ result }: OneTrickDetectionCardProps) {
  const { topHero: _topHero, topHeroPct, label, description, topHeroesData } = result;
  const hasData = topHeroesData.length > 0;
  const labelStyle = LABEL_STYLES[label];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Are you a one-trick?</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-bold tabular-nums">
                {topHeroPct}%
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${labelStyle.bg} ${labelStyle.text}`}
              >
                {label}
              </span>
            </div>
            <div className="flex flex-col gap-2" role="list" aria-label="Hero playtime breakdown">
              {topHeroesData.map((entry, i) => {
                const isTop = i === 0;
                const barColor = isTop
                  ? (ROLE_COLORS[entry.role] ?? "var(--chart-1)")
                  : "var(--muted-foreground)";
                const barOpacity = isTop ? 1 : 0.35;
                return (
                  <div key={entry.hero} className="flex items-center gap-2" role="listitem">
                    <span
                      className="w-24 shrink-0 truncate text-sm tabular-nums"
                      title={entry.hero}
                    >
                      {entry.hero}
                    </span>
                    <div className="relative flex-1 overflow-hidden rounded-sm h-5">
                      <div
                        className="absolute inset-y-0 left-0 rounded-sm transition-[width]"
                        style={{
                          width: `${entry.pct}%`,
                          backgroundColor: barColor,
                          opacity: barOpacity,
                        }}
                        aria-hidden="true"
                      />
                    </div>
                    <span
                      className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground"
                      aria-label={`${entry.pct} percent`}
                    >
                      {entry.pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex h-[200px] items-center justify-center">
            <p className="text-muted-foreground text-sm">No data yet</p>
          </div>
        )}
      </CardContent>
      {hasData && (
        <CardFooter>
          <p className="text-muted-foreground text-xs">
            Based on weighted playtime &middot; One-Trick ≥ {ONE_TRICK_THRESHOLD}% &middot; Specialist ≥ {SPECIALIST_THRESHOLD}%
          </p>
        </CardFooter>
      )}
    </Card>
  );
}

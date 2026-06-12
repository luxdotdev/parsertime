"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RoleStatsResult } from "@/lib/ranked-stats";

type RoleFlexibilityCardProps = {
  result: RoleStatsResult;
};

const LABEL_STYLES: Record<
  string,
  { bg: string; text: string }
> = {
  Adaptive: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  Flexible: {
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
  },
  Specialist: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
  },
};

export function RoleFlexibilityCard({ result }: RoleFlexibilityCardProps) {
  const { distribution, flexibility } = result;

  const hasData = distribution.some((d) => d.weightedCount > 0);
  const labelStyle = LABEL_STYLES[flexibility.label] ?? LABEL_STYLES.Specialist;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role flexibility</CardTitle>
        <CardDescription>{flexibility.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-bold tabular-nums">
                {flexibility.score}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${labelStyle.bg} ${labelStyle.text}`}
              >
                {flexibility.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {distribution.map((entry) => (
                <div key={entry.role} className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.fill }}
                    aria-hidden="true"
                  />
                  <span className="text-muted-foreground text-sm">
                    {entry.role}
                  </span>
                  <span className="font-mono text-sm font-medium tabular-nums">
                    {entry.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-16 items-center justify-center">
            <p className="text-muted-foreground text-sm">No data yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

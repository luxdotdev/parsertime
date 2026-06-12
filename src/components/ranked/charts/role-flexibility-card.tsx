"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { RoleStatsResult } from "@/lib/ranked-stats";

type RoleFlexibilityCardProps = {
  result: RoleStatsResult;
};

const LABEL_STYLES: Record<
  string,
  { bg: string; text: string }
> = {
  Adaptive: {
    bg: "bg-primary/15",
    text: "text-primary",
  },
  Flexible: {
    bg: "bg-muted",
    text: "text-foreground",
  },
  Specialist: {
    bg: "bg-muted",
    text: "text-muted-foreground",
  },
};

export function RoleFlexibilityCard({ result }: RoleFlexibilityCardProps) {
  const { distribution, flexibility } = result;

  const hasData = distribution.some((d) => d.weightedCount > 0);
  const labelStyle = LABEL_STYLES[flexibility.label] ?? LABEL_STYLES.Specialist;

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Roles"
        title="Role flexibility"
        description={flexibility.description}
      />
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
    </section>
  );
}

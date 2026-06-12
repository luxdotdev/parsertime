"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { HeroPoolDiversityResult } from "@/lib/ranked-stats";

type HeroPoolDiversityCardProps = {
  result: HeroPoolDiversityResult;
};

function buildDescription(result: HeroPoolDiversityResult): string {
  if (result.totalUnique === 0) return "No matches tracked yet";

  const rolesWithHeroes = result.byRole.filter((r) => r.count > 0);
  if (rolesWithHeroes.length === 0) return "No hero data available";

  if (rolesWithHeroes.length === 3) {
    return `You've played ${result.totalUnique} unique ${result.totalUnique === 1 ? "hero" : "heroes"} across all 3 roles`;
  }

  const dominant = result.byRole.reduce((a, b) => (a.count > b.count ? a : b));
  return `Your pool is concentrated in ${dominant.role} — ${result.totalUnique} unique ${result.totalUnique === 1 ? "hero" : "heroes"} total`;
}

export function HeroPoolDiversityCard({ result }: HeroPoolDiversityCardProps) {
  const { totalUnique, byRole, heroList } = result;
  const hasData = totalUnique > 0;
  const description = buildDescription(result);

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Hero pool"
        title="How wide is your hero pool?"
        description={description}
        rightSlot={
          hasData ? (
            <div
              className="flex flex-col items-center"
              aria-label={`${totalUnique} unique heroes`}
            >
              <span className="text-4xl font-bold tabular-nums leading-none">
                {totalUnique}
              </span>
              <span className="text-muted-foreground text-xs mt-1">
                {totalUnique === 1 ? "hero" : "heroes"}
              </span>
            </div>
          ) : undefined
        }
      />
      {hasData ? (
          <div className="flex flex-col gap-4" role="list" aria-label="Heroes by role">
            {byRole.map((roleEntry) => {
              const roleHeroes = heroList.filter((h) => h.role === roleEntry.role);
              return (
                <div key={roleEntry.role} className="flex flex-col gap-1.5" role="listitem">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: roleEntry.fill }}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium">{roleEntry.role}</span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {roleEntry.count} {roleEntry.count === 1 ? "hero" : "heroes"}
                    </span>
                  </div>
                  {roleHeroes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pl-4" aria-label={`${roleEntry.role} heroes`}>
                      {roleHeroes.map(({ hero }) => (
                        <span
                          key={hero}
                          className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium"
                          title={hero}
                        >
                          {hero}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="pl-4 text-muted-foreground text-xs">
                      No {roleEntry.role.toLowerCase()} heroes played yet
                    </p>
                  )}
                </div>
              );
            })}
          </div>
      ) : (
        <div className="flex h-[200px] items-center justify-center">
          <p className="text-muted-foreground text-sm">No data yet</p>
        </div>
      )}
    </section>
  );
}

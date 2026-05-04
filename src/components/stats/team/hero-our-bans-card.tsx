"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { TeamOurBanAnalysis } from "@/data/team/types";
import { cn, toHero, useHeroNames } from "@/lib/utils";
import Image from "next/image";

type HeroOurBansCardProps = {
  outgoing: TeamOurBanAnalysis;
};

const MAX_ROWS = 10;

export function HeroOurBansCard({ outgoing }: HeroOurBansCardProps) {
  const heroNames = useHeroNames();

  if (
    outgoing.totalMapsAnalyzed === 0 ||
    outgoing.mostBannedByUs.length === 0
  ) {
    return (
      <section className="space-y-4">
        <SectionHeader eyebrow="Heroes · Our bans" title="Our Ban Strategy" />
        <p className="text-muted-foreground text-sm">
          No outgoing ban data available for the selected time period.
        </p>
      </section>
    );
  }

  const strongBanSet = new Set(outgoing.strongBans.map((sb) => sb.hero));

  const rows = [...outgoing.mostBannedByUs]
    .sort((a, b) => b.totalBans - a.totalBans)
    .slice(0, MAX_ROWS);

  const maxBans = rows.length > 0 ? rows[0].totalBans : 1;

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Heroes · Our bans"
        title="Our Ban Strategy"
        description={`Heroes your team bans most frequently across ${outgoing.totalMapsAnalyzed} maps. High value tags mark bans that lift your win rate the most.`}
      />
      <div className="border-border overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
              <th className="px-4 py-2 text-left font-medium">Hero</th>
              <th className="px-4 py-2 text-right font-medium">Bans</th>
              <th className="w-32 px-4 py-2 text-left font-medium">
                Distribution
              </th>
              <th className="px-4 py-2 text-right font-medium">Ban Rate</th>
              <th className="px-4 py-2 text-right font-medium">WR Banned</th>
              <th className="px-4 py-2 text-right font-medium">
                WR Not Banned
              </th>
              <th className="px-4 py-2 text-right font-medium">WR Delta</th>
              <th className="w-28 px-4 py-2 text-right font-medium">Tag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((impact) => {
              const heroSlug = toHero(impact.hero);
              const displayName = heroNames.get(heroSlug) ?? impact.hero;
              const banRatePercent = (impact.banRate * 100).toFixed(1);
              const bannedPercent = (impact.winRateWhenBanned * 100).toFixed(0);
              const notBannedPercent = (
                impact.winRateWhenNotBanned * 100
              ).toFixed(0);
              const deltaValue = impact.winRateDelta * 100;
              const deltaSign = deltaValue > 0 ? "+" : "";
              const deltaPercent = `${deltaSign}${deltaValue.toFixed(1)}%`;
              const isStrongBan = strongBanSet.has(impact.hero);

              return (
                <tr
                  key={impact.hero}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="border-border relative h-9 w-9 shrink-0 overflow-hidden rounded border">
                        <Image
                          src={`/heroes/${heroSlug}.png`}
                          alt={displayName}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <span className="font-medium">{displayName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {impact.totalBans}
                  </td>
                  <td className="px-4 py-3">
                    <div className="bg-muted h-1.5 w-full max-w-[120px] overflow-hidden rounded-full">
                      <div
                        className="bg-primary/60 h-full"
                        style={{
                          width: `${(impact.totalBans / maxBans) * 100}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                    {banRatePercent}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {bannedPercent}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {notBannedPercent}%
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right font-mono font-semibold tabular-nums",
                      deltaValue > 0 && "text-primary",
                      deltaValue < 0 && "text-destructive",
                      deltaValue === 0 && "text-muted-foreground"
                    )}
                  >
                    {deltaPercent}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isStrongBan ? (
                      <span className="bg-primary/15 text-primary rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase">
                        High value
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

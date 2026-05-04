"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { CombinedBanAnalysis } from "@/data/team/types";
import { cn, toHero, useHeroNames } from "@/lib/utils";
import Image from "next/image";

type HeroBanImpactCardProps = {
  analysis: CombinedBanAnalysis;
};

const MAX_ROWS = 10;

export function HeroBanImpactCard({ analysis }: HeroBanImpactCardProps) {
  const heroNames = useHeroNames();
  const received = analysis.received;

  if (received.totalMapsAnalyzed === 0 || received.mostBanned.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader eyebrow="Heroes · Ban impact" title="Hero Ban Impact" />
        <p className="text-muted-foreground text-sm">
          No hero ban data available for the selected time period.
        </p>
      </section>
    );
  }

  const weakPointSet = new Set(received.weakPoints.map((wp) => wp.hero));

  const rows = [...received.mostBanned]
    .sort((a, b) => b.totalBans - a.totalBans)
    .slice(0, MAX_ROWS);

  const maxBans = rows.length > 0 ? rows[0].totalBans : 1;

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Heroes · Ban impact"
        title="Most Banned Heroes"
        description={`Heroes most frequently banned against your team across ${received.totalMapsAnalyzed} maps. Weak point tags mark heroes whose absence drops your win rate.`}
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
              <th className="px-4 py-2 text-right font-medium">WR With</th>
              <th className="px-4 py-2 text-right font-medium">WR Without</th>
              <th className="px-4 py-2 text-right font-medium">WR Delta</th>
              <th className="w-28 px-4 py-2 text-right font-medium">Tag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((impact) => {
              const heroSlug = toHero(impact.hero);
              const displayName = heroNames.get(heroSlug) ?? impact.hero;
              const banRatePercent = (impact.banRate * 100).toFixed(1);
              const withPercent = (impact.winRateWithHero * 100).toFixed(0);
              const withoutPercent = (impact.winRateWithoutHero * 100).toFixed(
                0
              );
              const deltaValue = impact.winRateDelta * 100;
              const deltaSign = deltaValue > 0 ? "+" : "";
              const deltaPercent = `${deltaSign}${deltaValue.toFixed(1)}%`;
              const isWeakPoint = weakPointSet.has(impact.hero);

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
                    {withPercent}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {withoutPercent}%
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
                    {isWeakPoint ? (
                      <span className="bg-destructive/15 text-destructive rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase">
                        Weak point
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

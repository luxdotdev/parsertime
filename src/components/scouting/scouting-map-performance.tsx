"use client";

import { DivergingBar } from "@/components/faceit/viz";
import { WinrateTable } from "@/components/faceit/winrate-table";
import { SectionHeader } from "@/components/stats/team/section-header";
import type { MapWinrateEntry } from "@/data/faceit/types";
import type { MapIntelligence, MapMatchupEntry } from "@/data/intelligence/types";
import type { ScoutingMapAnalysis } from "@/data/scouting/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Props = {
  mapAnalysis: ScoutingMapAnalysis;
  mapIntelligence: MapIntelligence;
  hasUserTeamLink: boolean;
};

const MIN_SAMPLE = 3;
const MATCHUP_MAGNITUDE = 30;
const VETO_COUNT = 3;

/** Rated-first, then win-rate desc; unrated trail by volume desc. */
function sortForScouting(rows: MapWinrateEntry[]): MapWinrateEntry[] {
  return [...rows].sort((a, b) => {
    if (a.rated !== b.rated) return a.rated ? -1 : 1;
    if (a.rated) return b.winRate - a.winRate;
    return b.played - a.played;
  });
}

export function ScoutingMapPerformance({
  mapAnalysis,
  mapIntelligence,
  hasUserTeamLink,
}: Props) {
  const t = useTranslations("scoutingPage.team.maps");

  const labels = {
    played: t("played"),
    won: t("won"),
    winRate: t("winRate"),
    lowSample: t("lowSample"),
    empty: t("noMaps"),
  };

  const byMapRows: MapWinrateEntry[] = mapAnalysis.byMap.map((m) => ({
    key: m.name,
    played: m.played,
    won: m.won,
    winRate: m.winRate,
    weightedWinRate: m.weightedWinRate,
    rated: m.played >= MIN_SAMPLE,
  }));

  const byTypeRows: MapWinrateEntry[] = mapAnalysis.byMapType.map((m) => ({
    key: m.mapType,
    played: m.played,
    won: m.won,
    winRate: m.winRate,
    weightedWinRate: m.weightedWinRate,
    rated: m.played >= MIN_SAMPLE,
  }));

  const matchups = mapIntelligence.matchupMatrix
    .filter((m): m is MapMatchupEntry & { netAdvantage: number } => m.netAdvantage != null)
    .sort((a, b) => b.netAdvantage - a.netAdvantage);

  const picks = matchups.filter((m) => m.netAdvantage > 0).slice(0, VETO_COUNT);
  const bans = matchups
    .filter((m) => m.netAdvantage < 0)
    .slice(-VETO_COUNT)
    .reverse();

  return (
    <section className="space-y-8">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} />

      {/* Map matchups — the actionable read, only when a user team is linked. */}
      {hasUserTeamLink ? (
        matchups.length > 0 ? (
          <div className="space-y-3">
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              {t("matchupTitle")}
            </p>

            <div className="border-border overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                    <th className="px-4 py-2 text-left font-medium">{t("map")}</th>
                    <th
                      className="hidden w-40 px-4 py-2 text-left font-medium sm:table-cell"
                      aria-hidden="true"
                    />
                    <th className="px-4 py-2 text-right font-medium">
                      {t("netAdvantageHeader")}
                    </th>
                    <th className="hidden px-4 py-2 text-right font-medium md:table-cell">
                      {t("versus")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {matchups.map((m) => {
                    const positive = m.netAdvantage > 0;
                    const negative = m.netAdvantage < 0;
                    return (
                      <tr
                        key={`${m.mapName}-${m.mapType}`}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="text-foreground font-medium">
                            {m.mapName}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          <DivergingBar
                            value={m.netAdvantage}
                            magnitude={MATCHUP_MAGNITUDE}
                            positiveTone="primary"
                            negativeTone="destructive"
                          />
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right font-mono font-semibold tabular-nums",
                            positive && "text-primary",
                            negative && "text-destructive"
                          )}
                        >
                          {t("percentagePoints", {
                            value: `${positive ? "+" : ""}${Math.round(m.netAdvantage)}`,
                          })}
                        </td>
                        <td className="text-muted-foreground hidden px-4 py-3 text-right font-mono text-xs tabular-nums md:table-cell">
                          {m.userWinRate != null
                            ? `${Math.round(m.userWinRate)}%`
                            : "—"}{" "}
                          <span className="text-muted-foreground/60">
                            {t("versus")}
                          </span>{" "}
                          {Math.round(m.opponentStrengthWeightedWR)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Veto recommendation: top picks, bottom bans. */}
            {picks.length > 0 || bans.length > 0 ? (
              <div className="space-y-2">
                <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
                  {t("vetoRecommendation")}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {picks.length > 0 ? (
                    <VetoList
                      label={t("pick")}
                      tone="primary"
                      entries={picks}
                      pp={t}
                    />
                  ) : null}
                  {bans.length > 0 ? (
                    <VetoList
                      label={t("ban")}
                      tone="destructive"
                      entries={bans}
                      pp={t}
                    />
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null
      ) : (
        <div className="border-border rounded-md border border-dashed px-4 py-6">
          <p className="text-foreground text-sm font-medium">
            {t("selectTeamTitle")}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("selectTeamDescription")}
          </p>
        </div>
      )}

      {/* Per-map performance. */}
      <div className="space-y-3">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {t("byMap")}
        </p>
        <WinrateTable
          rows={sortForScouting(byMapRows)}
          labels={{ ...labels, key: t("map") }}
        />
      </div>

      {/* By map type. */}
      <div className="space-y-3">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {t("byMapType")}
        </p>
        <WinrateTable
          rows={sortForScouting(byTypeRows)}
          labels={{ ...labels, key: t("mapType") }}
        />
      </div>
    </section>
  );
}

function VetoList({
  label,
  tone,
  entries,
  pp,
}: {
  label: string;
  tone: "primary" | "destructive";
  entries: (MapMatchupEntry & { netAdvantage: number })[];
  pp: (key: string, args: Record<string, string>) => string;
}) {
  return (
    <div className="border-border rounded-md border p-3">
      <span
        className={cn(
          "rounded-sm px-1.5 py-0.5 font-mono text-[9px] tracking-[0.14em] uppercase",
          tone === "primary"
            ? "bg-primary/15 text-primary"
            : "bg-destructive/15 text-destructive"
        )}
      >
        {label}
      </span>
      <ul className="mt-2 space-y-1.5">
        {entries.map((m) => (
          <li
            key={`${m.mapName}-${m.mapType}`}
            className="flex items-baseline justify-between gap-3"
          >
            <span className="text-foreground text-sm font-medium">
              {m.mapName}
            </span>
            <span
              className={cn(
                "font-mono text-xs font-semibold tabular-nums",
                tone === "primary" ? "text-primary" : "text-destructive"
              )}
            >
              {pp("percentagePoints", {
                value: `${m.netAdvantage > 0 ? "+" : ""}${Math.round(m.netAdvantage)}`,
              })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

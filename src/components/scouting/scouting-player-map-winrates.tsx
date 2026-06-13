"use client";

import { WinrateTable } from "@/components/faceit/winrate-table";
import { SectionHeader } from "@/components/stats/team/section-header";
import type { MapWinrateEntry } from "@/data/faceit/types";
import type { CompetitiveMapWinrates } from "@/data/player/types";
import { useTranslations } from "next-intl";

type Props = {
  competitiveMapWinrates: CompetitiveMapWinrates;
};

/** Rows below this sample size are flagged as low-confidence (unrated). */
const MIN_SAMPLE = 3;

type SourceEntry = {
  mapType?: string;
  mapName?: string;
  wins: number;
  losses: number;
  winRate: number;
  played: number;
};

/** Adapt a competitive map/mode entry into the shared WinrateTable row shape. */
function toWinrateRow(entry: SourceEntry, key: string): MapWinrateEntry {
  return {
    key,
    played: entry.played,
    won: entry.wins,
    winRate: entry.winRate,
    weightedWinRate: entry.winRate,
    rated: entry.played >= MIN_SAMPLE,
  };
}

/** Rated rows first, sorted by win rate desc; unrated rows after, by sample. */
function sortForScouting(rows: MapWinrateEntry[]): MapWinrateEntry[] {
  return [...rows].sort((a, b) => {
    if (a.rated !== b.rated) return a.rated ? -1 : 1;
    if (a.rated) return b.winRate - a.winRate;
    return b.played - a.played;
  });
}

export function ScoutingPlayerMapWinrates({ competitiveMapWinrates }: Props) {
  const t = useTranslations("scoutingPage.player.analytics.mapWinrates");

  const byMapType = sortForScouting(
    competitiveMapWinrates.byMapType.map((entry) =>
      toWinrateRow(entry, entry.mapType ?? "")
    )
  );
  const byMap = sortForScouting(
    competitiveMapWinrates.byMap.map((entry) =>
      toWinrateRow(entry, entry.mapName ?? "")
    )
  );

  const sharedLabels = {
    played: t("played"),
    won: t("won"),
    winRate: t("winRate"),
    lowSample: t("lowSample"),
    empty: t("empty"),
  };

  return (
    <section className="space-y-6">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} />
      <div className="space-y-2">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {t("byMapType")}
        </p>
        <WinrateTable
          rows={byMapType}
          labels={{ ...sharedLabels, key: t("mode") }}
        />
      </div>
      <div className="space-y-2">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {t("byMap")}
        </p>
        <WinrateTable rows={byMap} labels={{ ...sharedLabels, key: t("map") }} />
      </div>
    </section>
  );
}

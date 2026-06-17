"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { WinrateTable } from "@/components/faceit/winrate-table";
import type { MapWinrateEntry } from "@/data/faceit/types";
import { useTranslations } from "next-intl";

type Props = {
  byMap: MapWinrateEntry[];
  byType: MapWinrateEntry[];
};

/** Rated rows first, sorted by win rate desc; unrated rows after, by sample. */
function sortForScouting(rows: MapWinrateEntry[]): MapWinrateEntry[] {
  return [...rows].sort((a, b) => {
    if (a.rated !== b.rated) return a.rated ? -1 : 1;
    if (a.rated) return b.winRate - a.winRate;
    return b.played - a.played;
  });
}

export function PlayerMapWinrates({ byMap, byType }: Props) {
  const t = useTranslations("faceitPlayerPage");

  const labels = {
    played: t("maps.played"),
    won: t("maps.won"),
    winRate: t("maps.winRate"),
    lowSample: t("maps.lowSample"),
    empty: t("maps.empty"),
  };

  return (
    <section className="space-y-6">
      <SectionHeader eyebrow={t("maps.eyebrow")} title={t("maps.title")} />
      <div className="space-y-2">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {t("maps.byMap")}
        </p>
        <WinrateTable
          rows={sortForScouting(byMap)}
          labels={{ ...labels, key: t("maps.map") }}
        />
      </div>
      <div className="space-y-2">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {t("maps.byType")}
        </p>
        <WinrateTable
          rows={sortForScouting(byType)}
          labels={{ ...labels, key: t("maps.mode") }}
        />
      </div>
    </section>
  );
}

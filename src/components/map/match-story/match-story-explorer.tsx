"use client";

import { SectionHeader } from "@/components/section-header";
import type {
  FightEntry,
  MatchStoryData,
} from "@/lib/win-probability/timeline";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { FightLedgerTable } from "./fight-ledger-table";
import { InsightsStrip } from "./insights-strip";
import { WpTimelineChart } from "./wp-timeline-chart";

/** Fights that earn a numbered marker on the chart: anything an insight
 * references, plus the largest swings. Everything else stays a quiet dot. */
const NUMBERED_FIGHT_LIMIT = 5;

export function MatchStoryExplorer({
  data,
  team1Color,
  team2Color,
}: {
  data: MatchStoryData;
  team1Color: string;
  team2Color: string;
}) {
  const t = useTranslations("mapPage.matchStory");
  const [focusFight, setFocusFight] = useState<number | null>(null);

  const numberedFights = useMemo(() => {
    const flagged = new Set<number>();
    for (const insight of data.insights) {
      const fight = insight.values.fight;
      if (typeof fight === "number") flagged.add(fight - 1);
    }
    const bySwing = [...data.fights].sort(
      (a: FightEntry, b: FightEntry) => Math.abs(b.swing) - Math.abs(a.swing)
    );
    for (const fight of bySwing.slice(0, NUMBERED_FIGHT_LIMIT)) {
      flagged.add(fight.index);
    }
    return flagged;
  }, [data.insights, data.fights]);

  return (
    <div className="space-y-6">
      <InsightsStrip
        insights={data.insights}
        focusFight={focusFight}
        onFocusFight={setFocusFight}
      />
      <WpTimelineChart
        points={data.points}
        fights={data.fights}
        objectiveMarkers={data.objectiveMarkers}
        roundMarkers={data.roundMarkers}
        teams={data.teams}
        team1Color={team1Color}
        team2Color={team2Color}
        numberedFights={numberedFights}
        focusFight={focusFight}
        onFocusFight={setFocusFight}
      />
      <div>
        <SectionHeader id="fight-ledger" title={t("ledger.title")} />
        <FightLedgerTable
          fights={data.fights}
          teams={data.teams}
          team1Color={team1Color}
          team2Color={team2Color}
          focusFight={focusFight}
          onFocusFight={setFocusFight}
        />
      </div>
    </div>
  );
}

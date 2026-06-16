"use client";

import {
  StatRibbon,
  type RibbonCell,
} from "@/components/stats/team/stat-ribbon";
import type { ScrimInitiationData } from "@/data/scrim/types";
import { useFormatter, useTranslations } from "next-intl";

export function ScrimInitiationSection({
  initiation,
}: {
  initiation: ScrimInitiationData;
}) {
  const t = useTranslations("scrimPage.initiationSection");
  const format = useFormatter();

  function pct(value: number): string {
    return format.number(value / 100, {
      style: "percent",
      maximumFractionDigits: 0,
    });
  }

  if (initiation.teams.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("noData")}</p>;
  }

  const cells: RibbonCell[] = initiation.teams.map((team) => ({
    label: t("wentFirst", { team: team.teamName }),
    value: pct(team.initiationWinrate),
    sub: `${t("frequency", { first: team.wentFirst })} · ${t("record", {
      wins: team.wentFirstWins,
      losses: team.wentFirst - team.wentFirstWins,
    })}`,
    emphasis: true,
  }));

  return (
    <section className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {t("coverage", {
          covered: initiation.mapsCovered,
          total: initiation.mapsTotal,
        })}
      </p>
      <StatRibbon cells={cells} columns={4} />
    </section>
  );
}

"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { StatRibbon } from "@/components/stats/team/stat-ribbon";
import { ScoutingStrengthExplainer } from "@/components/scouting/scouting-strength-explainer";
import type {
  ScoutingTeamOverview,
  TeamStrengthRating,
} from "@/data/scouting/types";
import { useTranslations } from "next-intl";

type Props = {
  name: string;
  abbreviation: string;
  overview: ScoutingTeamOverview;
  strength: TeamStrengthRating | null;
  strengthPercentile: number | null;
};

const PROVISIONAL_MATCHES = 5;

export function ScoutingTeamHeader({
  name,
  abbreviation,
  overview,
  strength,
  strengthPercentile,
}: Props) {
  const t = useTranslations("scoutingPage.team");

  const provisional =
    strength != null && strength.matchesRated < PROVISIONAL_MATCHES;

  const strengthSub =
    strength == null
      ? t("overview.noCompetitiveData")
      : provisional
        ? t("overview.provisionalRating")
        : strengthPercentile != null
          ? t("overview.topPercentile", {
              value: `${Math.round(strengthPercentile)}%`,
            })
          : t("overview.matchesRated", { count: strength.matchesRated });

  const cells = [
    {
      label: t("overview.record"),
      value: `${overview.wins}–${overview.losses}`,
      sub: t("overview.matchCount", { count: overview.totalMatches }),
    },
    {
      label: t("overview.winRate"),
      value: `${Math.round(overview.winRate)}%`,
      sub: t("overview.weightedPercent", {
        value: `${Math.round(overview.weightedWinRate)}%`,
      }),
    },
    {
      label: t("overview.weightedWinRate"),
      value: `${Math.round(overview.weightedWinRate)}%`,
    },
    {
      label: t("overview.strengthRating"),
      value: strength != null ? String(Math.round(strength.rating)) : "—",
      sub: strengthSub,
      emphasis: strength != null && !provisional,
    },
  ];

  return (
    <header className="space-y-4">
      <SectionHeader
        eyebrow={t("header.eyebrow")}
        title={name}
        rightSlot={
          <div className="flex items-center gap-3">
            <span className="border-border text-muted-foreground rounded-sm border px-2 py-0.5 font-mono text-xs tracking-[0.16em] uppercase tabular-nums">
              {abbreviation}
            </span>
            <ScoutingStrengthExplainer />
          </div>
        }
      />
      <StatRibbon cells={cells} columns={4} />
    </header>
  );
}

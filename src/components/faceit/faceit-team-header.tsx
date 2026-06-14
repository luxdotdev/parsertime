"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { StatRibbon } from "@/components/stats/team/stat-ribbon";
import { FsrExplainer } from "@/components/faceit/fsr-explainer";
import type {
  FaceitTeamOverview,
  RelatedTeam,
  RosterStrength,
} from "@/data/faceit/types";
import { useTranslations } from "next-intl";
import type { Route } from "next";
import Link from "next/link";

type Props = {
  name: string;
  overview: FaceitTeamOverview;
  strength: RosterStrength;
  related: RelatedTeam[];
  teamId: string;
  combined: boolean;
};

export function FaceitTeamHeader({
  name,
  overview,
  strength,
  related,
  teamId,
  combined,
}: Props) {
  const t = useTranslations("faceitScoutingPage");

  const cells = [
    {
      label: t("overview.record"),
      value: `${overview.wins}–${overview.losses}`,
      sub: t("overview.matchesPlayed", { count: overview.totalMatches }),
    },
    {
      label: t("overview.winRate"),
      value: `${Math.round(overview.winRate)}%`,
      sub: t("overview.weightedSub", {
        winRate: Math.round(overview.weightedWinRate),
      }),
    },
    {
      label: t("strengthFsr"),
      value: strength.fsr != null ? String(strength.fsr) : "—",
      sub: t("coverage", {
        covered: strength.fsrCovered,
        size: strength.rosterSize,
      }),
      emphasis: strength.fsr != null,
    },
    {
      label: t("strengthTsr"),
      value: strength.tsr != null ? String(strength.tsr) : "—",
      sub: t("coverage", {
        covered: strength.tsrCovered,
        size: strength.rosterSize,
      }),
    },
  ];

  const toggleHref = (
    combined
      ? `/faceit/team/${encodeURIComponent(teamId)}`
      : `/faceit/team/${encodeURIComponent(teamId)}?combined=1`
  ) as Route;

  return (
    <header className="space-y-4">
      <SectionHeader
        eyebrow={t("header.eyebrow")}
        title={name}
        rightSlot={<FsrExplainer />}
      />
      <StatRibbon cells={cells} columns={4} />
      {related.length > 0 ? (
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase">
            {t("related.title")}
          </span>
          {related.map((r, i) => (
            <span key={r.faceitTeamId}>
              <Link
                href={
                  `/faceit/team/${encodeURIComponent(r.faceitTeamId)}` as Route
                }
                className="text-foreground hover:text-primary font-medium underline-offset-2 hover:underline"
              >
                {r.name}
              </Link>
              <span className="ml-1 text-xs">
                ({t("related.shared", { n: r.sharedCorePlayers })})
              </span>
              {i < related.length - 1 ? "," : ""}
            </span>
          ))}
          <Link
            href={toggleHref}
            className="hover:text-foreground ml-1 underline underline-offset-4"
          >
            {combined ? t("related.separate") : t("related.combine")}
          </Link>
        </div>
      ) : null}
    </header>
  );
}

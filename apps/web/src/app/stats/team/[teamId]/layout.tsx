import { RangeTransitionProvider } from "@/components/stats/team/range-transition-context";
import { TeamStatsContent } from "@/components/stats/team/team-stats-content";
import { TeamStatsHeaderClient } from "@/components/stats/team/team-stats-header-client";
import { TeamStatsTabsNav } from "@/components/stats/team/team-stats-tabs-nav";
import { defaultLocale } from "@/i18n/config";
import { isAuthedToViewTeam } from "@/lib/auth";
import { positionalData, simulationTool } from "@/lib/flags";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import prisma from "@/lib/prisma";
import type { Metadata } from "next";
import { Suspense } from "react";

export async function generateMetadata(
  props: LayoutProps<"/stats/team/[teamId]">
): Promise<Metadata> {
  const params = await props.params;
  const t = getMetadataTranslations("teamStatsPage.layoutMetadata");

  const teamId = parseInt(params.teamId);
  const canViewTeam =
    Number.isSafeInteger(teamId) &&
    teamId > 0 &&
    (await isAuthedToViewTeam(teamId));
  const team = canViewTeam
    ? await prisma.team.findFirst({
        where: { id: teamId },
        select: { name: true },
      })
    : null;

  const teamName = team?.name ?? t("defaultTeam");

  return {
    title: t("title", { teamName }),
    description: t("description", { teamName }),
    openGraph: {
      title: t("ogTitle", { teamName }),
      description: t("ogDescription", { teamName }),
      url: "https://parsertime.app",
      type: "website",
      siteName: "Parsertime",
      images: [
        {
          url: `https://parsertime.app/api/og?title=${t("ogImage", { teamName })}`,
          width: 1200,
          height: 630,
        },
      ],
      locale: defaultLocale,
    },
  };
}

// The persistent shell: header (client, authed via API) + tab nav. This layout
// performs NO authorization — auth lives in each page's loadTeamStatsShell and
// in the header's stats-summary API route, since layouts do not re-render on
// soft navigation and are not a valid security boundary. Only non-sensitive
// data (feature flags, the teamId already in the URL) is read here.
export default function TeamStatsLayout(
  props: LayoutProps<"/stats/team/[teamId]">
) {
  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <RangeTransitionProvider>
        <Suspense fallback={<div className="h-24" />}>
          <TeamStatsNav params={props.params} />
        </Suspense>
        <TeamStatsContent>{props.children}</TeamStatsContent>
      </RangeTransitionProvider>
    </div>
  );
}

async function TeamStatsNav({
  params,
}: {
  params: LayoutProps<"/stats/team/[teamId]">["params"];
}) {
  const { teamId: rawTeamId } = await params;
  const teamId = parseInt(rawTeamId);

  const [positionalEnabled, simulationEnabled] = await Promise.all([
    positionalData(),
    simulationTool(),
  ]);

  return (
    <>
      <TeamStatsHeaderClient teamId={teamId} />
      <TeamStatsTabsNav
        teamId={teamId}
        positionalEnabled={positionalEnabled}
        simulationEnabled={simulationEnabled}
      />
    </>
  );
}

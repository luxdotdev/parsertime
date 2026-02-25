import { BanStrategy } from "@/components/scouting/ban-strategy";
import { HeroBanChart } from "@/components/scouting/hero-ban-chart";
import { MapVetoAdvisor } from "@/components/scouting/map-veto-advisor";
import { MatchHistoryTable } from "@/components/scouting/match-history-table";
import { MethodologyCard } from "@/components/scouting/methodology-card";
import { PlayerMatchups } from "@/components/scouting/player-matchups";
import { ScoutForTeamPicker } from "@/components/scouting/scout-for-team-picker";
import { ScoutingReport } from "@/components/scouting/scouting-report";
import { TeamOverviewEnhanced } from "@/components/scouting/team-overview-enhanced";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getHeroBanIntelligence } from "@/data/hero-ban-intelligence-dto";
import { getMapIntelligence } from "@/data/map-intelligence-dto";
import {
  getTeamStrengthRating,
  getTeamStrengthPercentile,
} from "@/data/opponent-strength-dto";
import { getPlayerIntelligence } from "@/data/player-intelligence-dto";
import { getScoutingTeamProfile } from "@/data/scouting-dto";
import { auth } from "@/lib/auth";
import { resolveDataAvailability } from "@/lib/data-availability";
import { scoutingTool } from "@/lib/flags";
import { generateInsights } from "@/lib/insights";
import prisma from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

type UserTeamOption = { id: number; name: string };

async function getUserTeams(): Promise<{
  teams: UserTeamOption[];
  userId: string | null;
}> {
  const session = await auth();
  if (!session?.user?.email) return { teams: [], userId: null };

  const user = await prisma.user.findFirst({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return { teams: [], userId: null };

  const teams = await prisma.team.findMany({
    where: {
      OR: [
        { ownerId: user.id },
        { users: { some: { id: user.id } } },
        { managers: { some: { userId: user.id } } },
      ],
      id: { not: 0 },
    },
    select: { id: true, name: true, scoutingTeamAbbr: true },
    orderBy: { updatedAt: "desc" },
  });

  return {
    teams: teams.map((t) => ({ id: t.id, name: t.name })),
    userId: user.id,
  };
}

function resolveScoutForTeamId(
  scoutForParam: string | undefined,
  userTeams: UserTeamOption[]
): number | null {
  if (!scoutForParam) return null;
  const parsed = parseInt(scoutForParam, 10);
  if (Number.isNaN(parsed)) return null;
  if (!userTeams.some((t) => t.id === parsed)) return null;
  return parsed;
}

export default async function ScoutingTeamPage(
  props: PageProps<"/scouting/team/[teamAbbr]"> & {
    searchParams: Promise<{ scoutFor?: string }>;
  }
) {
  const scoutingEnabled = await scoutingTool();
  if (!scoutingEnabled) notFound();

  const [params, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const teamAbbr = decodeURIComponent(params.teamAbbr);
  const t = await getTranslations("scoutingPage.team");

  const profile = await getScoutingTeamProfile(teamAbbr);
  if (!profile) notFound();

  const { overview } = profile;
  const { teams: userTeams } = await getUserTeams();

  const userTeamId = resolveScoutForTeamId(searchParams.scoutFor, userTeams);
  const hasUserTeamLink = userTeamId !== null;

  const [strengthRating, strengthPercentile, dataAvailability] =
    await Promise.all([
      getTeamStrengthRating(teamAbbr),
      getTeamStrengthPercentile(teamAbbr),
      resolveDataAvailability(teamAbbr, userTeamId),
    ]);

  const [mapIntelligence, banIntelligence, playerIntelligence] =
    await Promise.all([
      getMapIntelligence(teamAbbr, userTeamId, dataAvailability),
      getHeroBanIntelligence(teamAbbr, userTeamId, dataAvailability),
      userTeamId
        ? getPlayerIntelligence(userTeamId, teamAbbr, dataAvailability)
        : Promise.resolve(null),
    ]);

  const insightReport = generateInsights({
    mapIntelligence,
    banIntelligence,
    playerIntelligence,
    strengthRating,
    opponentAbbr: teamAbbr,
    hasUserTeamLink,
    dataAvailability,
  });

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/scouting"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("backToSearch")}
          </Link>
          <ScoutForTeamPicker
            userTeams={userTeams}
            currentTeamId={userTeamId}
          />
        </div>

        <header className="space-y-1">
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {profile.team.abbreviation}
            </h1>
            <span className="text-muted-foreground text-lg">
              {profile.team.fullName}
            </span>
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm tabular-nums">
            <span>
              {overview.wins}W &ndash; {overview.losses}L
            </span>
            <span className="font-medium">
              {overview.winRate.toFixed(1)}% {t("overview.winRate")}
            </span>
            <span>
              {overview.weightedWinRate.toFixed(1)}%{" "}
              {t("overview.weightedWinRate")}
            </span>
            <FormStreak form={overview.recentForm} />
          </div>
        </header>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
          <TabsTrigger value="maps">{t("tabs.maps")}</TabsTrigger>
          <TabsTrigger value="heroBans">{t("tabs.heroBans")}</TabsTrigger>
          <TabsTrigger value="players">{t("tabs.players")}</TabsTrigger>
          <TabsTrigger value="report">{t("tabs.report")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <TeamOverviewEnhanced
            overview={overview}
            strengthRating={strengthRating}
            strengthPercentile={strengthPercentile}
            matchHistory={profile.matchHistory}
          />
          <MatchHistoryTable matches={profile.matchHistory} />
          <MethodologyCard translationKey="scoutingPage.team.overview.methodology" />
        </TabsContent>

        <TabsContent value="maps" className="space-y-4">
          <MapVetoAdvisor
            mapIntelligence={mapIntelligence}
            hasUserTeamLink={hasUserTeamLink}
          />
          <MethodologyCard translationKey="scoutingPage.team.maps.methodology" />
        </TabsContent>

        <TabsContent value="heroBans" className="space-y-4">
          <HeroBanChart heroBans={profile.heroBans} />
          <BanStrategy
            banIntelligence={banIntelligence}
            hasUserTeamLink={hasUserTeamLink}
          />
          <MethodologyCard translationKey="scoutingPage.team.heroBans.methodology" />
        </TabsContent>

        <TabsContent value="players" className="space-y-4">
          <PlayerMatchups
            playerIntelligence={playerIntelligence}
            hasUserTeamLink={hasUserTeamLink}
          />
          <MethodologyCard translationKey="scoutingPage.team.players.methodology" />
        </TabsContent>

        <TabsContent value="report" className="space-y-4">
          <ScoutingReport
            report={insightReport}
            opponentAbbr={teamAbbr}
            hasUserTeamLink={hasUserTeamLink}
            dataAvailability={dataAvailability}
          />
          <MethodologyCard translationKey="scoutingPage.team.report.methodology" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FormStreak({ form }: { form: ("win" | "loss")[] }) {
  if (form.length === 0) return null;

  let streak = 1;
  const currentResult = form[0];
  for (let i = 1; i < form.length; i++) {
    if (form[i] === currentResult) streak++;
    else break;
  }

  const label = currentResult === "win" ? "W" : "L";

  return (
    <span
      className={
        currentResult === "win"
          ? "font-semibold text-emerald-600 dark:text-emerald-400"
          : "font-semibold text-red-600 dark:text-red-400"
      }
    >
      {label}
      {streak}
    </span>
  );
}

import { RecentActivityCalendar } from "@/components/profile/recent-activity-calendar";
import { MapWinrateGallery } from "@/components/stats/team/map-winrate-gallery";
import { StrengthsWeaknessesCard } from "@/components/stats/team/strengths-weaknesses-card";
import { TeamFightStatsCard } from "@/components/stats/team/team-fight-stats-card";
import { TeamRosterGrid } from "@/components/stats/team/team-roster-grid";
import { TopMapsCard } from "@/components/stats/team/top-maps-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTeamFightStats } from "@/data/team-fight-stats-dto";
import {
  getBestMapByWinrate,
  getBlindSpotMap,
  getTeamRoster,
  getTeamWinrates,
  getTop5MapsByPlaytime,
  getTopMapsByPlaytime,
} from "@/data/team-stats-dto";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getMapNames } from "@/lib/utils";
import type { PagePropsWithLocale } from "@/types/next";
import { $Enums } from "@prisma/client";
import { notFound } from "next/navigation";

export default async function TeamStatsPage(
  props: PagePropsWithLocale<"/stats/team/[teamId]">
) {
  const session = await auth();
  const user = await getUser(session?.user.email);
  if (!user) notFound();

  const params = await props.params;
  const teamId = parseInt(params.teamId);

  const team = await prisma.team.findFirst({
    where: { id: teamId },
    include: { users: true },
  });
  if (!team) notFound();

  // If the user is not a member of the team and is not an admin, do not show the page
  const userIsMember = team.users.some((teamUser) => teamUser.id === user.id);
  if (!userIsMember && user.role !== $Enums.UserRole.ADMIN) notFound();

  const [
    scrims,
    teamRoster,
    winrates,
    top5Maps,
    allMapsPlaytime,
    bestMapByWinrate,
    blindSpotMap,
    fightStats,
    mapNames,
  ] = await Promise.all([
    prisma.scrim.findMany({
      where: { teamId },
    }),
    getTeamRoster(teamId),
    getTeamWinrates(teamId),
    getTop5MapsByPlaytime(teamId),
    getTopMapsByPlaytime(teamId),
    getBestMapByWinrate(teamId),
    getBlindSpotMap(teamId),
    getTeamFightStats(teamId),
    getMapNames(),
  ]);

  // Convert playtime array to Record for gallery
  const mapPlaytimes: Record<string, number> = {};
  allMapsPlaytime.forEach((map) => {
    mapPlaytimes[map.name] = map.playtime;
  });

  const totalGames = winrates.overallWins + winrates.overallLosses;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      {/* Header Section */}
      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
        {totalGames > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              Overall Record: {winrates.overallWins}W - {winrates.overallLosses}
              L
            </span>
            <span className="font-semibold">
              {winrates.overallWinrate.toFixed(1)}% Win Rate
            </span>
          </div>
        )}
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="maps">Maps</TabsTrigger>
          <TabsTrigger value="teamfights">Teamfights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Team Roster */}
            <TeamRosterGrid roster={teamRoster} />

            {/* Recent Activity Calendar */}
            <RecentActivityCalendar scrims={scrims} />
          </div>

          {/* Two Column Layout: Top Maps + Strengths/Weaknesses */}
          <div className="grid gap-4 md:grid-cols-2">
            <TopMapsCard
              topMaps={top5Maps}
              winrates={winrates.byMap}
              mapNames={mapNames}
            />
            <StrengthsWeaknessesCard
              bestMap={bestMapByWinrate}
              blindSpot={blindSpotMap}
              mapNames={mapNames}
            />
          </div>
        </TabsContent>

        {/* Maps Tab */}
        <TabsContent value="maps" className="space-y-4">
          <MapWinrateGallery
            winrates={winrates.byMap}
            mapPlaytimes={mapPlaytimes}
            mapNames={mapNames}
          />
        </TabsContent>

        {/* Teamfights Tab */}
        <TabsContent value="teamfights" className="space-y-4">
          <TeamFightStatsCard fightStats={fightStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

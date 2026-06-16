import { MapModePerformanceCard } from "@/components/stats/team/map-mode-performance-card";
import { MapWinrateGallery } from "@/components/stats/team/map-winrate-gallery";
import { PlayerMapPerformanceCard } from "@/components/stats/team/player-map-performance-card";
import { StatRibbon } from "@/components/stats/team/stat-ribbon";
import { TeamStatsGate } from "@/components/stats/team/team-stats-gate";
import { AppRuntime } from "@/data/runtime";
import {
  TeamAnalyticsService,
  TeamMapModeService,
  TeamStatsService,
} from "@/data/team";
import { getMapNames } from "@/lib/utils";
import type { PagePropsWithLocale } from "@/types/next";
import { Effect } from "effect";
import { loadTeamStatsShell } from "../_lib/context";

export const maxDuration = 60;

export default async function Page(
  props: PagePropsWithLocale<"/stats/team/[teamId]/maps"> & {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const shell = await loadTeamStatsShell(params.teamId, searchParams);
  if (shell.gated) {
    return <TeamStatsGate scrimCount={shell.totalScrimCount} />;
  }

  const { teamId, dateRange } = shell;

  const [
    { allMapsPlaytime, mapModePerformance, winrates },
    mapNames,
    playerMapPerformance,
  ] = await Promise.all([
    AppRuntime.runPromise(
      Effect.all(
        {
          allMapsPlaytime: TeamStatsService.pipe(
            Effect.flatMap((svc) => svc.getTopMapsByPlaytime(teamId, dateRange))
          ),
          mapModePerformance: TeamMapModeService.pipe(
            Effect.flatMap((svc) =>
              svc.getMapModePerformance(teamId, dateRange)
            )
          ),
          winrates: TeamStatsService.pipe(
            Effect.flatMap((svc) => svc.getTeamWinrates(teamId, dateRange))
          ),
        },
        { concurrency: "unbounded" }
      )
    ),
    getMapNames(),
    AppRuntime.runPromise(
      TeamAnalyticsService.pipe(
        Effect.flatMap((svc) =>
          svc.getPlayerMapPerformanceMatrix(teamId, dateRange)
        )
      )
    ),
  ]);

  const mapPlaytimes: Record<string, number> = {};
  allMapsPlaytime.forEach((map) => {
    mapPlaytimes[map.name] = map.playtime;
  });

  return (
    <div className="mt-8 space-y-12">
      <StatRibbon
        cells={[
          {
            label: "Maps played",
            value: String(allMapsPlaytime.length),
            sub: "unique maps",
            emphasis: true,
          },
          {
            label: "Best mode",
            value: mapModePerformance.bestMode ?? "—",
            sub: mapModePerformance.bestMode
              ? `${mapModePerformance.byMode[mapModePerformance.bestMode].winrate.toFixed(0)}% winrate`
              : "no data",
          },
          {
            label: "Bleed mode",
            value: mapModePerformance.worstMode ?? "—",
            sub: mapModePerformance.worstMode
              ? `${mapModePerformance.byMode[mapModePerformance.worstMode].winrate.toFixed(0)}% winrate`
              : "no data",
          },
          {
            label: "Modes played",
            value: String(
              Object.values(mapModePerformance.byMode).filter(
                (m) => m.gamesPlayed > 0
              ).length
            ),
            sub: "with games",
          },
        ]}
        columns={4}
      />
      <MapModePerformanceCard modePerformance={mapModePerformance} />
      <MapWinrateGallery
        winrates={winrates.byMap}
        mapPlaytimes={mapPlaytimes}
        mapNames={mapNames}
      />
      <PlayerMapPerformanceCard data={playerMapPerformance} />
    </div>
  );
}

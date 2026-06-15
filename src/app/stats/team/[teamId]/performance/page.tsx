import { BestRoleTriosCard } from "@/components/stats/team/best-role-trios-card";
import { RolePerformanceCard } from "@/components/stats/team/role-performance-card";
import { StatRibbon } from "@/components/stats/team/stat-ribbon";
import { TeamStatsGate } from "@/components/stats/team/team-stats-gate";
import { TeamStatsHeader } from "@/components/stats/team/team-stats-header";
import { AppRuntime } from "@/data/runtime";
import { TeamRoleStatsService } from "@/data/team";
import type { PagePropsWithLocale } from "@/types/next";
import { Effect } from "effect";
import { loadTeamStatsHeaderData, loadTeamStatsShell } from "../_lib/context";

export const maxDuration = 60;

export default async function Page(
  props: PagePropsWithLocale<"/stats/team/[teamId]/performance"> & {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const shell = await loadTeamStatsShell(params.teamId, searchParams);
  if (shell.gated) {
    return (
      <TeamStatsGate team={shell.team} scrimCount={shell.totalScrimCount} />
    );
  }

  const { teamId, dateRange } = shell;
  const headerData = await loadTeamStatsHeaderData(shell);

  const { roleStats, roleBalance, bestTrios } = await AppRuntime.runPromise(
    Effect.all(
      {
        roleStats: TeamRoleStatsService.pipe(
          Effect.flatMap((svc) =>
            svc.getRolePerformanceStats(teamId, dateRange)
          )
        ),
        roleBalance: TeamRoleStatsService.pipe(
          Effect.flatMap((svc) => svc.getRoleBalanceAnalysis(teamId, dateRange))
        ),
        bestTrios: TeamRoleStatsService.pipe(
          Effect.flatMap((svc) => svc.getBestRoleTrios(teamId, dateRange))
        ),
      },
      { concurrency: "unbounded" }
    )
  );

  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <TeamStatsHeader
        team={shell.team}
        teamId={teamId}
        effectiveTimeframe={shell.effectiveTimeframe}
        permissions={shell.permissions}
        headerData={headerData}
        totalScrimCount={shell.totalScrimCount}
        positionalEnabled={shell.positionalEnabled}
        simulationEnabled={shell.simulationEnabled}
      />
      <div className="mt-8 space-y-12">
        <StatRibbon
          cells={[
            {
              label: "Tank K/D",
              value: roleStats.Tank.kd.toFixed(2),
              sub:
                roleStats.Tank.totalPlaytime > 0
                  ? `${(roleStats.Tank.totalPlaytime / 3600).toFixed(1)}h played`
                  : "no playtime",
            },
            {
              label: "Damage K/D",
              value: roleStats.Damage.kd.toFixed(2),
              sub:
                roleStats.Damage.totalPlaytime > 0
                  ? `${(roleStats.Damage.totalPlaytime / 3600).toFixed(1)}h played`
                  : "no playtime",
            },
            {
              label: "Support K/D",
              value: roleStats.Support.kd.toFixed(2),
              sub:
                roleStats.Support.totalPlaytime > 0
                  ? `${(roleStats.Support.totalPlaytime / 3600).toFixed(1)}h played`
                  : "no playtime",
            },
            {
              label: "Best role",
              value: roleBalance.strongestRole ?? "—",
              sub: roleBalance.strongestRole
                ? "leading K/D"
                : "insufficient data",
              emphasis: !!roleBalance.strongestRole,
            },
          ]}
          columns={4}
        />
        <RolePerformanceCard roleStats={roleStats} />
        <BestRoleTriosCard trios={bestTrios} />
      </div>
    </div>
  );
}

import { getComparisonStats } from "@/data/comparison-dto";
import { getScrimOverview } from "@/data/scrim-overview-dto";
import {
  getRecentForm,
  getStreakInfo,
  getWinrateOverTime,
} from "@/data/team-performance-trends-dto";
import { getTeamWinrates } from "@/data/team-stats-dto";
import prisma from "@/lib/prisma";
import type { HeroName } from "@/types/heroes";
import { tool } from "ai";
import { z } from "zod";
import {
  formatScrimListEntry,
  formatScrimOverview,
  formatTeamWinrates,
} from "./formatters";

export function buildTools(opts: {
  allowedTeamIds: Set<number>;
  userTeams: { id: number; name: string; image: string | null }[];
}) {
  const { allowedTeamIds, userTeams } = opts;

  function assertTeamAccess(teamId: number) {
    if (!allowedTeamIds.has(teamId)) {
      throw new Error("You don't have access to this team.");
    }
  }

  return {
    getTeamOverview: tool({
      description:
        "Get the user's teams and their player rosters. Call this first to understand which teams and players the user has access to.",
      inputSchema: z.object({}),
      execute: async () => {
        const teams = await Promise.all(
          userTeams.map(async (team) => {
            const scrims = await prisma.scrim.count({
              where: { teamId: team.id },
            });

            const roster = await prisma.playerStat.findMany({
              where: {
                MapData: { Map: { Scrim: { teamId: team.id } } },
              },
              select: { player_name: true },
              distinct: ["player_name"],
            });

            return {
              id: team.id,
              name: team.name,
              totalScrims: scrims,
              players: roster.map((r) => r.player_name).slice(0, 20),
            };
          })
        );
        return { teams };
      },
    }),

    getScrimList: tool({
      description:
        "List recent scrims for a team. Returns scrim IDs, names, dates, and map info. Use the scrim IDs with getScrimAnalysis for detailed analysis.",
      inputSchema: z.object({
        teamId: z.number().describe("The team ID to list scrims for."),
        limit: z
          .number()
          .min(1)
          .max(20)
          .default(10)
          .describe("Number of scrims to return (default 10, max 20)."),
      }),
      execute: async ({ teamId, limit }) => {
        assertTeamAccess(teamId);
        const scrims = await prisma.scrim.findMany({
          where: { teamId },
          orderBy: { date: "desc" },
          take: limit,
          include: {
            maps: {
              select: { id: true, name: true },
            },
          },
        });
        return {
          scrims: scrims.map(formatScrimListEntry),
          total: scrims.length,
        };
      },
    }),

    getScrimAnalysis: tool({
      description:
        "Get a detailed analysis of a specific scrim, including player performance, fight analysis, ultimate economy, hero swaps, and statistical outliers. Requires a scrim ID (get from getScrimList) and the team ID.",
      inputSchema: z.object({
        scrimId: z.number().describe("The scrim ID to analyze."),
        teamId: z
          .number()
          .describe(
            "The team ID (used to determine which side is 'our team')."
          ),
      }),
      execute: async ({ scrimId, teamId }) => {
        assertTeamAccess(teamId);
        const scrim = await prisma.scrim.findFirst({
          where: { id: scrimId, teamId },
        });
        if (!scrim) {
          return { error: `Scrim ${scrimId} not found for team ${teamId}.` };
        }
        const data = await getScrimOverview(scrimId, teamId);
        return formatScrimOverview(data);
      },
    }),

    getPlayerPerformance: tool({
      description:
        "Get detailed performance stats for a specific player across selected maps. Requires map IDs (get from getScrimList or getScrimAnalysis). Optionally filter by specific heroes.",
      inputSchema: z.object({
        mapIds: z
          .array(z.number())
          .min(1)
          .describe(
            "Array of map IDs to analyze the player's performance across."
          ),
        playerName: z
          .string()
          .describe("The player's in-game name (case-sensitive)."),
        heroes: z
          .array(z.string())
          .optional()
          .describe(
            "Optional: filter stats to specific heroes (e.g., ['Ana', 'Kiriko'])."
          ),
      }),
      execute: async ({ mapIds, playerName, heroes }) => {
        const maps = await prisma.map.findMany({
          where: { id: { in: mapIds } },
          select: { Scrim: { select: { teamId: true } } },
        });
        const hasAccess = maps.some(
          (m) => m.Scrim?.teamId && allowedTeamIds.has(m.Scrim.teamId)
        );
        if (!hasAccess) {
          return { error: "You don't have access to the requested maps." };
        }
        const data = await getComparisonStats(
          mapIds,
          playerName,
          heroes as HeroName[] | undefined
        );
        return {
          playerName: data.playerName,
          mapCount: data.mapCount,
          heroes: data.filteredHeroes,
          aggregated: data.aggregated,
          trends: data.trends,
          perMapBreakdown: data.perMapBreakdown.slice(0, 5),
        };
      },
    }),

    getMapPerformance: tool({
      description:
        "Get the team's win rates broken down by map. Shows overall record and per-map win/loss/winrate.",
      inputSchema: z.object({
        teamId: z.number().describe("The team ID to get map performance for."),
      }),
      execute: async ({ teamId }) => {
        assertTeamAccess(teamId);
        const data = await getTeamWinrates(teamId);
        return formatTeamWinrates(data);
      },
    }),

    getTeamTrends: tool({
      description:
        "Get the team's performance trends over time, including win rate trajectory (weekly), recent form (last 10 scrims), and current win/loss streak.",
      inputSchema: z.object({
        teamId: z
          .number()
          .describe("The team ID to get performance trends for."),
      }),
      execute: async ({ teamId }) => {
        assertTeamAccess(teamId);
        const [winrateOverTime, recentForm, streakInfo] = await Promise.all([
          getWinrateOverTime(teamId),
          getRecentForm(teamId),
          getStreakInfo(teamId),
        ]);
        return {
          winrateOverTime: winrateOverTime.map((dp) => ({
            period: dp.period,
            winrate: Math.round(dp.winrate * 10) / 10,
            wins: dp.wins,
            losses: dp.losses,
          })),
          recentForm: {
            last5Winrate: Math.round(recentForm.last5Winrate * 10) / 10,
            last10Winrate: Math.round(recentForm.last10Winrate * 10) / 10,
            last20Winrate: Math.round(recentForm.last20Winrate * 10) / 10,
            last10: recentForm.last10.map((m) => ({
              date: m.date.toISOString().split("T")[0],
              result: m.result,
              mapName: m.mapName,
            })),
          },
          streak: {
            currentStreak: streakInfo.currentStreak,
            longestWinStreak: {
              count: streakInfo.longestWinStreak.count,
            },
            longestLossStreak: {
              count: streakInfo.longestLossStreak.count,
            },
          },
        };
      },
    }),
  };
}

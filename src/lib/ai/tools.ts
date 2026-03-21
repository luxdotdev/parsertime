import { getComparisonStats } from "@/data/comparison-dto";
import { getMapIntelligence } from "@/data/map-intelligence-dto";
import { getPlayerIntelligence } from "@/data/player-intelligence-dto";
import { getScrimOverview } from "@/data/scrim-overview-dto";
import { getTeamFightStats } from "@/data/team-fight-stats-dto";
import { getHeroPoolAnalysis } from "@/data/team-hero-pool-dto";
import {
  getRecentForm,
  getStreakInfo,
  getWinrateOverTime,
} from "@/data/team-performance-trends-dto";
import { getRolePerformanceStats } from "@/data/team-role-stats-dto";
import { getTeamRoster } from "@/data/team-shared-data";
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
  userId: string;
  allowedTeamIds: Set<number>;
  userTeams: { id: number; name: string; image: string | null }[];
}) {
  const { userId, allowedTeamIds, userTeams } = opts;

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

    getBulkScrimAnalysis: tool({
      description:
        "Get analysis for multiple scrims at once. More efficient than calling getScrimAnalysis repeatedly. Returns an array of scrim analyses with the same data as getScrimAnalysis. Use when comparing across scrims or analyzing a range of recent games.",
      inputSchema: z.object({
        scrimIds: z
          .array(z.number())
          .min(1)
          .max(10)
          .describe("Array of scrim IDs to analyze (max 10)."),
        teamId: z
          .number()
          .describe(
            "The team ID (used to determine which side is 'our team')."
          ),
      }),
      execute: async ({ scrimIds, teamId }) => {
        assertTeamAccess(teamId);
        const scrims = await prisma.scrim.findMany({
          where: { id: { in: scrimIds }, teamId },
          select: { id: true, name: true },
        });
        const validIds = new Set(scrims.map((s) => s.id));
        const results = await Promise.all(
          scrimIds
            .filter((id) => validIds.has(id))
            .map(async (scrimId) => {
              const data = await getScrimOverview(scrimId, teamId);
              return { scrimId, ...formatScrimOverview(data) };
            })
        );
        return {
          analyzed: results.length,
          requested: scrimIds.length,
          scrims: results,
        };
      },
    }),

    getOpponentStats: tool({
      description:
        "Get the opponent team's player stats from a scrim. Shows each opponent player's heroes, K/D, eliminations, damage, and healing per 10 minutes. Use when analyzing what the other team did or identifying opponent tendencies.",
      inputSchema: z.object({
        scrimId: z.number().describe("The scrim ID."),
        teamId: z
          .number()
          .describe("Your team ID (opponent stats are inferred from this)."),
      }),
      execute: async ({ scrimId, teamId }) => {
        assertTeamAccess(teamId);
        const scrim = await prisma.scrim.findFirst({
          where: { id: scrimId, teamId },
          include: {
            maps: { select: { id: true, mapData: { select: { id: true } } } },
          },
        });
        if (!scrim) {
          return { error: `Scrim ${scrimId} not found for team ${teamId}.` };
        }

        const mapDataIds = scrim.maps.flatMap((m) =>
          m.mapData.map((md) => md.id)
        );
        if (mapDataIds.length === 0) return { error: "No map data found." };

        const roster = await getTeamRoster(teamId);
        const rosterSet = new Set(roster);

        const allStats = await prisma.playerStat.findMany({
          where: { MapDataId: { in: mapDataIds } },
          select: {
            player_name: true,
            player_team: true,
            player_hero: true,
            eliminations: true,
            final_blows: true,
            deaths: true,
            hero_damage_dealt: true,
            healing_dealt: true,
            hero_time_played: true,
          },
        });

        const opponentStats = allStats.filter(
          (s) => !rosterSet.has(s.player_name)
        );

        const playerMap = new Map<
          string,
          {
            heroes: Set<string>;
            eliminations: number;
            finalBlows: number;
            deaths: number;
            heroDamage: number;
            healing: number;
            timePlayed: number;
            team: string;
          }
        >();

        for (const s of opponentStats) {
          const existing = playerMap.get(s.player_name);
          if (existing) {
            existing.heroes.add(s.player_hero);
            existing.eliminations += s.eliminations;
            existing.finalBlows += s.final_blows;
            existing.deaths += s.deaths;
            existing.heroDamage += s.hero_damage_dealt;
            existing.healing += s.healing_dealt;
            existing.timePlayed += s.hero_time_played;
          } else {
            playerMap.set(s.player_name, {
              heroes: new Set([s.player_hero]),
              eliminations: s.eliminations,
              finalBlows: s.final_blows,
              deaths: s.deaths,
              heroDamage: s.hero_damage_dealt,
              healing: s.healing_dealt,
              timePlayed: s.hero_time_played,
              team: s.player_team,
            });
          }
        }

        function per10(value: number, time: number) {
          return time > 0 ? Math.round((value / time) * 600 * 10) / 10 : 0;
        }

        const players = [...playerMap.entries()].map(([name, s]) => ({
          playerName: name,
          team: s.team,
          heroes: [...s.heroes],
          kdRatio:
            s.deaths > 0
              ? Math.round((s.eliminations / s.deaths) * 100) / 100
              : s.eliminations,
          eliminationsPer10: per10(s.eliminations, s.timePlayed),
          finalBlowsPer10: per10(s.finalBlows, s.timePlayed),
          deathsPer10: per10(s.deaths, s.timePlayed),
          heroDamagePer10: per10(s.heroDamage, s.timePlayed),
          healingPer10: per10(s.healing, s.timePlayed),
        }));

        return {
          opponentTeam: players[0]?.team ?? "Unknown",
          players,
        };
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

    getTeamFightAnalysis: tool({
      description:
        "Get detailed fight statistics for a team — win rates when getting first pick vs first death, first ult advantage, dry fight performance, fight reversals, and ultimate efficiency. Great for understanding what makes the team win or lose fights.",
      inputSchema: z.object({
        teamId: z.number().describe("The team ID."),
      }),
      execute: async ({ teamId }) => {
        assertTeamAccess(teamId);
        const data = await getTeamFightStats(teamId);
        return data;
      },
    }),

    getHeroPool: tool({
      description:
        "Get the team's hero pool analysis — hero diversity per player, playtime distribution by role, hero specialists, and which heroes each player is most experienced on. Useful for understanding team flexibility and identifying one-tricks.",
      inputSchema: z.object({
        teamId: z.number().describe("The team ID."),
      }),
      execute: async ({ teamId }) => {
        assertTeamAccess(teamId);
        const data = await getHeroPoolAnalysis(teamId);
        return data;
      },
    }),

    getRoleStats: tool({
      description:
        "Get performance stats aggregated by role (Tank, DPS, Support) — eliminations, deaths, damage, healing, and ultimate usage per role. Shows how each role line is performing relative to expectations.",
      inputSchema: z.object({
        teamId: z.number().describe("The team ID."),
      }),
      execute: async ({ teamId }) => {
        assertTeamAccess(teamId);
        const data = await getRolePerformanceStats(teamId);
        return data;
      },
    }),

    getPlayerIntel: tool({
      description:
        "Get player intelligence — hero depth analysis (how deep each player's hero pool is), substitution rates (how often players are forced off their primary hero), vulnerabilities (which players are most targetable by bans), and best player highlights. Requires an opponent abbreviation for ban analysis context (pass null if unknown).",
      inputSchema: z.object({
        teamId: z.number().describe("The team ID."),
        opponentAbbr: z
          .string()
          .nullable()
          .describe(
            "Opponent team abbreviation for ban context (e.g., 'DSG'). Pass null if unknown."
          ),
      }),
      execute: async ({ teamId, opponentAbbr }) => {
        assertTeamAccess(teamId);
        const data = await getPlayerIntelligence(teamId, opponentAbbr);
        return data;
      },
    }),

    getMapIntel: tool({
      description:
        "Get map intelligence — strength-weighted win rates (adjusted for opponent quality), performance trends per map, map type dependencies (Control vs Escort vs Hybrid etc.), and head-to-head matchup analysis. Requires an opponent abbreviation for matchup comparison.",
      inputSchema: z.object({
        opponentAbbr: z
          .string()
          .describe("Opponent team abbreviation (e.g., 'DSG')."),
        teamId: z
          .number()
          .nullable()
          .describe(
            "Your team ID for matchup comparison. Pass null for opponent-only analysis."
          ),
      }),
      execute: async ({ opponentAbbr, teamId }) => {
        if (teamId) assertTeamAccess(teamId);
        const data = await getMapIntelligence(opponentAbbr, teamId);
        return data;
      },
    }),

    generateReport: tool({
      description:
        "Create a shareable report from the analysis you've done. Write the report content in markdown with clear sections, stats, and insights. Every claim must be backed by specific numbers from the data. The report will be saved and a shareable URL returned. Only call this when the user explicitly asks to create or share a report.",
      inputSchema: z.object({
        title: z
          .string()
          .describe(
            "Report title (e.g., 'DSG vs Entropy Scrim Analysis - March 13')"
          ),
        content: z
          .string()
          .describe(
            "The full report content in markdown. Every insight must cite specific stats (e.g., '62.5% fight win rate', '3.2 K/D'). Include headers, data tables, key findings backed by numbers, and actionable recommendations."
          ),
      }),
      execute: async ({ title, content }) => {
        const report = await prisma.chatReport.create({
          data: { userId, title, content },
        });
        return {
          reportId: report.id,
          url: `/reports/${report.id}`,
          title: report.title,
        };
      },
    }),
  };
}

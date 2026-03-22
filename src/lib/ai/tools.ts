import { getComparisonStats } from "@/data/comparison-dto";
import { getMapIntelligence } from "@/data/map-intelligence-dto";
import { getPlayerIntelligence } from "@/data/player-intelligence-dto";
import {
  getScrimAbilityTiming,
  getScrimFightTimelines,
} from "@/data/scrim-ability-timing-dto";
import { getScrimOverview } from "@/data/scrim-overview-dto";
import { getTeamAbilityImpact } from "@/data/team-ability-impact-dto";
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
import { allHeroes } from "@/types/heroes";
import type { Prisma } from "@prisma/client";
import { tool } from "ai";
import { z } from "zod";
import {
  formatScrimListEntry,
  formatScrimOverview,
  formatTeamWinrates,
} from "./formatters";

function per10(value: number, time: number) {
  return time > 0 ? Math.round((value / time) * 600 * 10) / 10 : 0;
}

async function computeOpponentStats(scrimId: number, teamId: number) {
  const scrim = await prisma.scrim.findFirst({
    where: { id: scrimId, teamId },
    include: {
      maps: { select: { id: true, mapData: { select: { id: true } } } },
    },
  });
  if (!scrim)
    return { error: `Scrim ${scrimId} not found for team ${teamId}.` };

  const mapDataIds = scrim.maps.flatMap((m) => m.mapData.map((md) => md.id));
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

  const opponentStats = allStats.filter((s) => !rosterSet.has(s.player_name));

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
    scrimId,
    opponentTeam: players[0]?.team ?? "Unknown",
    players,
  };
}

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
        "List scrims for a team with optional search, date filtering, and pagination. Returns scrim IDs, names, dates, and map info. Use scrim IDs with getScrimAnalysis for detailed analysis. Use 'cursor' from a previous response to paginate through results.",
      inputSchema: z.object({
        teamId: z.number().describe("The team ID to list scrims for."),
        limit: z
          .number()
          .min(1)
          .max(20)
          .default(10)
          .describe("Number of scrims to return (default 10, max 20)."),
        search: z
          .string()
          .optional()
          .describe(
            "Search by scrim name (case-insensitive). E.g., 'vs Entropy' or 'playoffs'."
          ),
        after: z
          .string()
          .optional()
          .describe(
            "Only return scrims after this date (ISO format, e.g., '2025-03-01')."
          ),
        before: z
          .string()
          .optional()
          .describe(
            "Only return scrims before this date (ISO format, e.g., '2025-03-15')."
          ),
        cursor: z
          .number()
          .optional()
          .describe(
            "Cursor for pagination — pass the 'nextCursor' value from a previous response to get the next page."
          ),
      }),
      execute: async ({ teamId, limit, search, after, before, cursor }) => {
        assertTeamAccess(teamId);

        const where: Prisma.ScrimWhereInput = { teamId };
        if (search) {
          where.name = { contains: search, mode: "insensitive" };
        }
        if (after || before) {
          where.date = {
            ...(after ? { gte: new Date(after) } : {}),
            ...(before ? { lte: new Date(before) } : {}),
          };
        }

        const scrims = await prisma.scrim.findMany({
          where,
          orderBy: { date: "desc" },
          take: limit,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          include: {
            maps: {
              select: { id: true, name: true },
            },
          },
        });

        const totalCount = await prisma.scrim.count({ where });
        const nextCursor =
          scrims.length === limit ? scrims[scrims.length - 1]?.id : undefined;

        return {
          scrims: scrims.map(formatScrimListEntry),
          returned: scrims.length,
          totalCount,
          nextCursor,
          hasMore: nextCursor !== undefined,
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
        return computeOpponentStats(scrimId, teamId);
      },
    }),

    getBulkOpponentStats: tool({
      description:
        "Get opponent stats for multiple scrims at once. More efficient than calling getOpponentStats repeatedly. Returns per-scrim opponent player breakdowns. Use when analyzing opponent tendencies across a series.",
      inputSchema: z.object({
        scrimIds: z
          .array(z.number())
          .min(1)
          .max(10)
          .describe("Array of scrim IDs (max 10)."),
        teamId: z
          .number()
          .describe("Your team ID (opponent stats are inferred from this)."),
      }),
      execute: async ({ scrimIds, teamId }) => {
        assertTeamAccess(teamId);
        const results = await Promise.all(
          scrimIds.map((id) => computeOpponentStats(id, teamId))
        );
        return {
          analyzed: results.filter((r) => !("error" in r)).length,
          requested: scrimIds.length,
          scrims: results,
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

    getScrimAbilityTiming: tool({
      description:
        "Get ability timing impact analysis for a specific scrim — shows when high-impact abilities (rated 'high' or 'critical') were used relative to fight phases (pre-fight, early, mid, late, cleanup) and how that timing correlates with fight win rates. Also surfaces outliers where timing significantly affected outcomes. Use when asked about ability timing in a specific scrim (e.g., 'Were we using Suzu too early in fights last scrim?', 'How did our Sym TP timing look in scrim 42?').",
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
        if (!scrim) return { error: `Scrim ${scrimId} not found.` };

        const data = await getScrimAbilityTiming(scrimId, teamId);

        if (data.rows.length === 0) {
          return {
            error:
              "No high-impact ability timing data available for this scrim. Ability usage may not have been collected.",
          };
        }

        const rows = data.rows.map((row) => ({
          hero: row.heroName,
          ability: row.abilityName,
          impact: row.impactRating,
          totalFights: row.totalFights,
          overallWinrate: Math.round(row.overallWinrate * 10) / 10,
          phases: Object.fromEntries(
            Object.entries(row.phases).map(([phase, stats]) => [
              phase,
              {
                fights: stats.fights,
                winrate:
                  stats.fights >= 3
                    ? Math.round(stats.winrate * 10) / 10
                    : null,
              },
            ])
          ),
        }));

        const outliers = data.outliers.map((o) => ({
          hero: o.heroName,
          ability: o.abilityName,
          phase: o.phase,
          phaseWinrate: Math.round(o.phaseWinrate * 10) / 10,
          overallWinrate: Math.round(o.overallWinrate * 10) / 10,
          deviation: Math.round(o.deviation * 10) / 10,
          bestPhase: o.bestPhase,
          bestPhaseWinrate: Math.round(o.bestPhaseWinrate * 10) / 10,
          type: o.type,
        }));

        return { rows, outliers };
      },
    }),

    getAbilityImpact: tool({
      description:
        "Get ability usage impact analysis for a team — shows how using specific hero abilities (e.g., Symmetra Teleporter, Kiriko Protection Suzu, Lúcio Amp It Up) affects fight win rates. Returns per-ability data with 'used vs not used' win rate comparisons and fight counts. Filter to specific heroes or get all available data. Great for answering questions like 'How does using Sym TP affect our winrates?' or 'Which abilities have the biggest impact on fights?'",
      inputSchema: z.object({
        teamId: z.number().describe("The team ID."),
        heroes: z
          .array(z.string())
          .optional()
          .describe(
            "Optional list of hero names to filter to (e.g., ['Symmetra', 'Kiriko']). If omitted, returns all heroes with ability data."
          ),
      }),
      execute: async ({ teamId, heroes }) => {
        assertTeamAccess(teamId);
        const data = await getTeamAbilityImpact(teamId);

        if (!data || Object.keys(data.byHero).length === 0) {
          return { error: "No ability impact data available for this team." };
        }

        const heroEntries = heroes
          ? Object.entries(data.byHero).filter(([name]) =>
              heroes.some((h) => h.toLowerCase() === name.toLowerCase())
            )
          : Object.entries(data.byHero);

        if (heroEntries.length === 0) {
          return {
            error: `No ability data found for the specified heroes. Available heroes: ${data.availableHeroes.join(", ")}`,
          };
        }

        const formatted = heroEntries.map(([heroName, impact]) => ({
          hero: heroName,
          ability1: {
            name: impact.ability1.abilityName,
            totalFights: impact.ability1.totalFightsAnalyzed,
            usedByUs: {
              fights: impact.ability1.scenarios.usedByUs.fights,
              winrate:
                Math.round(impact.ability1.scenarios.usedByUs.winrate * 10) /
                10,
            },
            notUsedByUs: {
              fights: impact.ability1.scenarios.notUsedByUs.fights,
              winrate:
                Math.round(impact.ability1.scenarios.notUsedByUs.winrate * 10) /
                10,
            },
            usedByEnemy: {
              fights: impact.ability1.scenarios.usedByEnemy.fights,
              winrate:
                Math.round(impact.ability1.scenarios.usedByEnemy.winrate * 10) /
                10,
            },
            notUsedByEnemy: {
              fights: impact.ability1.scenarios.notUsedByEnemy.fights,
              winrate:
                Math.round(
                  impact.ability1.scenarios.notUsedByEnemy.winrate * 10
                ) / 10,
            },
          },
          ability2: {
            name: impact.ability2.abilityName,
            totalFights: impact.ability2.totalFightsAnalyzed,
            usedByUs: {
              fights: impact.ability2.scenarios.usedByUs.fights,
              winrate:
                Math.round(impact.ability2.scenarios.usedByUs.winrate * 10) /
                10,
            },
            notUsedByUs: {
              fights: impact.ability2.scenarios.notUsedByUs.fights,
              winrate:
                Math.round(impact.ability2.scenarios.notUsedByUs.winrate * 10) /
                10,
            },
            usedByEnemy: {
              fights: impact.ability2.scenarios.usedByEnemy.fights,
              winrate:
                Math.round(impact.ability2.scenarios.usedByEnemy.winrate * 10) /
                10,
            },
            notUsedByEnemy: {
              fights: impact.ability2.scenarios.notUsedByEnemy.fights,
              winrate:
                Math.round(
                  impact.ability2.scenarios.notUsedByEnemy.winrate * 10
                ) / 10,
            },
          },
        }));

        return {
          heroes: formatted,
          availableHeroes: data.availableHeroes,
        };
      },
    }),

    getScrimFightTimelines: tool({
      description:
        "Get per-fight timeline data for a specific scrim — each fight's start/end time, duration, outcome, kill events (who killed whom and when), and ability uses with exact match timestamps. Use this when you need to reason about specific fights: whether an ability was on cooldown when a player died, the sequence of events in a lost fight, or why a specific fight was won or lost. Call getHeroInfo alongside this to know ability cooldowns.",
      inputSchema: z.object({
        scrimId: z.number().describe("The scrim ID to analyze."),
        teamId: z
          .number()
          .describe(
            "The team ID (used to determine which side is 'our team')."
          ),
        fightNumbers: z
          .array(z.number())
          .optional()
          .describe(
            "Optional list of specific fight numbers to return (1-indexed). If omitted, returns all fights. Use to focus on specific fights of interest."
          ),
      }),
      execute: async ({ scrimId, teamId, fightNumbers }) => {
        assertTeamAccess(teamId);
        const scrim = await prisma.scrim.findFirst({
          where: { id: scrimId, teamId },
        });
        if (!scrim) return { error: `Scrim ${scrimId} not found.` };

        const data = await getScrimFightTimelines(scrimId, teamId);

        if (data.fights.length === 0) {
          return {
            error: "No fight timeline data available for this scrim.",
          };
        }

        const fights =
          fightNumbers && fightNumbers.length > 0
            ? data.fights.filter((f) => fightNumbers.includes(f.fightNumber))
            : data.fights;

        return {
          ourTeamName: data.ourTeamName,
          totalFights: data.fights.length,
          fights,
        };
      },
    }),

    getHeroInfo: tool({
      description:
        "Get detailed hero ability information — descriptions, cooldowns, tags, and impact ratings. Use this to understand what abilities do and how long their cooldowns are. Essential context when analyzing ability timing data from getScrimAbilityTiming or getAbilityImpact. Call this for the relevant heroes before interpreting ability timing results.",
      inputSchema: z.object({
        heroes: z
          .array(z.string())
          .describe(
            "List of hero names to look up (e.g., ['Kiriko', 'Ana', 'Junker Queen']). Use exact hero names."
          ),
      }),
      execute: ({ heroes }) => {
        const results = heroes
          .map((name) => {
            const hero = allHeroes.find(
              (h) => h.name.toLowerCase() === name.toLowerCase()
            );
            if (!hero) return null;
            return {
              name: hero.name,
              ability1: {
                name: hero.ability1.name,
                description: hero.ability1.description,
                cooldown: hero.ability1.cooldown,
                tags: [...hero.ability1.tags],
                impact: hero.ability1.impact,
              },
              ability2: {
                name: hero.ability2.name,
                description: hero.ability2.description,
                cooldown: hero.ability2.cooldown,
                tags: [...hero.ability2.tags],
                impact: hero.ability2.impact,
              },
            };
          })
          .filter(Boolean);

        if (results.length === 0) {
          return {
            error: `No heroes found matching: ${heroes.join(", ")}. Use exact hero names (e.g., "D.Va", "Lúcio", "Soldier: 76").`,
          };
        }

        return { heroes: results };
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

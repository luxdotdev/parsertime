/* oxlint-disable typescript-eslint/consistent-type-assertions, typescript-eslint/require-await */
/**
 * Migration parity tests: verify new Effect services produce identical results
 * to the old DTO implementations given the same Prisma mock data.
 *
 * Strategy:
 * - Mock Prisma with controlled fixture data
 * - Call the old DTO function directly (they use the same Prisma singleton)
 * - Run the new Effect service method via Effect.runPromise with a test layer
 * - Compare results structurally
 */

import { Effect, Layer, Logger } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma");
vi.mock("server-only", () => ({}));
vi.mock("react", () => ({
  cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
}));
vi.mock("@/instrumentation", async () => {
  const { Layer } = await import("effect");
  return { EffectObservabilityLive: Layer.empty };
});
vi.mock("@/lib/axiom/server", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import prisma from "@/lib/__mocks__/prisma";

// ---------------------------------------------------------------------------
// User domain
// ---------------------------------------------------------------------------
import { getUser, getTeamsWithPerms } from "@/data/user-dto";
import { UserService, UserServiceLive } from "@/data/user/service";

const TestLogger = Logger.none;

describe("User service parity", () => {
  const mockUser = {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    emailVerified: null,
    image: null,
    role: "USER" as const,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  beforeEach(() => {
    prisma.user.findFirst.mockResolvedValue(mockUser);
    prisma.team.findMany.mockResolvedValue([]);
    prisma.appSettings.findFirst.mockResolvedValue(null);
  });

  it("getUser returns same result", async () => {
    const oldResult = await getUser("test@example.com");

    const testLayer = UserServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      UserService.pipe(
        Effect.flatMap((svc) => svc.getUser("test@example.com"))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult).toEqual(oldResult);
  });

  it("getUser with undefined email returns null for both", async () => {
    const oldResult = await getUser(undefined);

    const testLayer = UserServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      UserService.pipe(Effect.flatMap((svc) => svc.getUser(undefined))).pipe(
        Effect.provide(testLayer)
      )
    );

    expect(newResult).toEqual(oldResult);
    expect(newResult).toBeNull();
  });

  it("getTeamsWithPerms returns same result", async () => {
    const oldResult = await getTeamsWithPerms("test@example.com");

    const testLayer = UserServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      UserService.pipe(
        Effect.flatMap((svc) => svc.getTeamsWithPerms("test@example.com"))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult).toEqual(oldResult);
  });
});

// ---------------------------------------------------------------------------
// Tournament domain
// ---------------------------------------------------------------------------
import { getTournament, getUserTournaments } from "@/data/tournament-dto";
import {
  TournamentService,
  TournamentServiceLive,
} from "@/data/tournament/tournament-service";

describe("Tournament service parity", () => {
  const mockTournament = {
    id: 1,
    name: "Test Tournament",
    creatorId: "user-1",
    format: "SINGLE_ELIMINATION" as const,
    status: "IN_PROGRESS" as const,
    teamSize: 8,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    teams: [],
    rounds: [],
    matches: [],
  };

  beforeEach(() => {
    prisma.tournament.findUnique.mockResolvedValue(mockTournament);
    prisma.tournament.findMany.mockResolvedValue([]);
  });

  it("getTournament returns same result", async () => {
    const oldResult = await getTournament(1);

    const testLayer = TournamentServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      TournamentService.pipe(
        Effect.flatMap((svc) => svc.getTournament(1))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult).toEqual(oldResult);
  });

  it("getUserTournaments returns same result", async () => {
    const oldResult = await getUserTournaments("user-1");

    const testLayer = TournamentServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      TournamentService.pipe(
        Effect.flatMap((svc) => svc.getUserTournaments("user-1"))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult).toEqual(oldResult);
  });
});

// ---------------------------------------------------------------------------
// Hero domain
// ---------------------------------------------------------------------------
import { getAllKillsForHero, getAllDeathsForHero } from "@/data/hero-dto";
import { HeroService, HeroServiceLive } from "@/data/hero/service";

describe("Hero service parity", () => {
  const mockKills = [
    {
      id: 1,
      scrimId: 1,
      event_type: "kill" as const,
      match_time: 100,
      MapDataId: 10,
      attacker_team: "Team A",
      attacker_name: "Player1",
      attacker_hero: "Ana",
      victim_team: "Team B",
      victim_name: "Player2",
      victim_hero: "Genji",
      event_ability: "Biotic Rifle",
      event_damage: 70,
      is_critical_hit: false,
      is_environmental: false,
      round_number: 1,
      objective_index: 0,
      attacker_x: 0,
      attacker_y: 0,
      attacker_z: 0,
      victim_x: 0,
      victim_y: 0,
      victim_z: 0,
    },
  ];

  beforeEach(() => {
    prisma.scrim.findMany.mockResolvedValue([
      {
        id: 1,
        maps: [{ id: 1, mapData: [{ id: 10 }] }],
      } as never,
    ]);
    prisma.kill.findMany.mockResolvedValue(mockKills as never);
  });

  it("getAllKillsForHero returns same result", async () => {
    const oldResult = await getAllKillsForHero([1], "Ana");

    const testLayer = HeroServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      HeroService.pipe(
        Effect.flatMap((svc) => svc.getAllKillsForHero([1], "Ana"))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult).toEqual(oldResult);
  });

  it("getAllDeathsForHero returns same result", async () => {
    const oldResult = await getAllDeathsForHero([1], "Ana");

    const testLayer = HeroServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      HeroService.pipe(
        Effect.flatMap((svc) => svc.getAllDeathsForHero([1], "Ana"))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult).toEqual(oldResult);
  });
});

// ---------------------------------------------------------------------------
// Admin domain
// ---------------------------------------------------------------------------
import { getUnlabeledMatches } from "@/data/data-labeling-dto";
import {
  DataLabelingService,
  DataLabelingServiceLive,
} from "@/data/admin/data-labeling-service";

describe("Admin service parity", () => {
  beforeEach(() => {
    prisma.scoutingMatch.findMany.mockResolvedValue([]);
    prisma.scoutingMatch.count.mockResolvedValue(0);
  });

  it("getUnlabeledMatches returns same result for empty data", async () => {
    const oldResult = await getUnlabeledMatches(0, 10);

    const testLayer = DataLabelingServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      DataLabelingService.pipe(
        Effect.flatMap((svc) => svc.getUnlabeledMatches(0, 10))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult).toEqual(oldResult);
  });
});

// ---------------------------------------------------------------------------
// Scrim domain (basic)
// ---------------------------------------------------------------------------
import { getScrim } from "@/data/scrim-dto";
import { ScrimService, ScrimServiceLive } from "@/data/scrim/scrim-service";

describe("Scrim service parity", () => {
  const mockScrim = {
    id: 1,
    name: "Test Scrim",
    date: new Date("2024-06-01"),
    creatorId: "user-1",
    teamId: 1,
    guestMode: false,
  };

  beforeEach(() => {
    prisma.scrim.findFirst.mockResolvedValue(mockScrim as never);
  });

  it("getScrim returns same result", async () => {
    const oldResult = await getScrim(1);

    const testLayer = ScrimServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      ScrimService.pipe(Effect.flatMap((svc) => svc.getScrim(1))).pipe(
        Effect.provide(testLayer)
      )
    );

    expect(newResult).toEqual(oldResult);
  });

  it("getScrim with non-existent id returns null for both", async () => {
    prisma.scrim.findFirst.mockResolvedValue(null);

    const oldResult = await getScrim(999);

    const testLayer = ScrimServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      ScrimService.pipe(Effect.flatMap((svc) => svc.getScrim(999))).pipe(
        Effect.provide(testLayer)
      )
    );

    expect(newResult).toEqual(oldResult);
    expect(newResult).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Team shared-core (pure functions — no mocking needed)
// ---------------------------------------------------------------------------
import {
  buildFinalRoundMap,
  buildMatchStartMap,
  findTeamNameForMapInMemory,
} from "@/data/team-shared-core";
import {
  buildFinalRoundMap as newBuildFinalRoundMap,
  buildMatchStartMap as newBuildMatchStartMap,
  findTeamNameForMapInMemory as newFindTeamNameForMapInMemory,
} from "@/data/team/shared-core";

describe("Team shared-core pure function parity", () => {
  it("findTeamNameForMapInMemory returns same result", () => {
    const stats = [
      { player_name: "Player1", player_team: "Team A", MapDataId: 1 },
      { player_name: "Player2", player_team: "Team A", MapDataId: 1 },
      { player_name: "Player3", player_team: "Team B", MapDataId: 1 },
    ];
    const roster = new Set(["Player1", "Player2"]);

    const oldResult = findTeamNameForMapInMemory(1, stats, roster);
    const newResult = newFindTeamNameForMapInMemory(1, stats, roster);

    expect(newResult).toEqual(oldResult);
    expect(newResult).toBe("Team A");
  });

  it("buildMatchStartMap returns same result", () => {
    const matchStarts = [
      {
        id: 1,
        MapDataId: 10,
        map_name: "Lijiang Tower",
        map_type: "Control" as const,
        team_1_name: "A",
        team_2_name: "B",
        match_time: 0,
        scrimId: 1,
        event_type: "match_start" as const,
        round_number: 0,
        objective_index: 0,
      },
      {
        id: 2,
        MapDataId: 20,
        map_name: "Numbani",
        map_type: "Hybrid" as const,
        team_1_name: "A",
        team_2_name: "B",
        match_time: 0,
        scrimId: 1,
        event_type: "match_start" as const,
        round_number: 0,
        objective_index: 0,
      },
    ] as Parameters<typeof buildMatchStartMap>[0];

    const oldResult = buildMatchStartMap(matchStarts);
    const newResult = newBuildMatchStartMap(matchStarts);

    expect(newResult).toEqual(oldResult);
    expect(newResult.size).toBe(2);
    expect(newResult.get(10)?.map_name).toBe("Lijiang Tower");
  });

  it("buildFinalRoundMap keeps highest round number per map", () => {
    const rounds = [
      {
        id: 1,
        MapDataId: 10,
        round_number: 1,
        match_time: 100,
        scrimId: 1,
        event_type: "round_end" as const,
        team_1_score: 1,
        team_2_score: 0,
        objective_index: 0,
        capturing_team: null,
      },
      {
        id: 2,
        MapDataId: 10,
        round_number: 3,
        match_time: 300,
        scrimId: 1,
        event_type: "round_end" as const,
        team_1_score: 2,
        team_2_score: 1,
        objective_index: 0,
        capturing_team: null,
      },
      {
        id: 3,
        MapDataId: 10,
        round_number: 2,
        match_time: 200,
        scrimId: 1,
        event_type: "round_end" as const,
        team_1_score: 1,
        team_2_score: 1,
        objective_index: 0,
        capturing_team: null,
      },
    ] as Parameters<typeof buildFinalRoundMap>[0];

    const oldResult = buildFinalRoundMap(rounds);
    const newResult = newBuildFinalRoundMap(rounds);

    expect(newResult).toEqual(oldResult);
    expect(newResult.get(10)?.round_number).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Comparison computation (pure functions)
// ---------------------------------------------------------------------------
import {
  aggregatePlayerStats as oldAggregate,
  calculateTrends as oldCalculateTrends,
} from "@/data/comparison-dto";
import {
  aggregatePlayerStats as newAggregate,
  calculateTrends as newCalculateTrends,
} from "@/data/comparison/computation";

describe("Comparison computation parity", () => {
  it("aggregatePlayerStats returns same result for empty input", () => {
    const oldResult = oldAggregate([], []);
    const newResult = newAggregate([], []);
    expect(newResult).toEqual(oldResult);
  });

  it("calculateTrends returns same result for empty input", () => {
    const oldResult = oldCalculateTrends([], []);
    const newResult = newCalculateTrends([], []);
    expect(newResult).toEqual(oldResult);
  });
});

// ---------------------------------------------------------------------------
// Scouting opponent strength (division-by-zero fix verification)
// ---------------------------------------------------------------------------
import {
  OpponentStrengthService,
  OpponentStrengthServiceLive,
} from "@/data/scouting/opponent-strength-service";

describe("Opponent strength edge cases", () => {
  it("getTeamStrengthPercentile handles single-team case without NaN", async () => {
    prisma.scoutingMatch.findMany.mockResolvedValue([
      {
        id: 1,
        team1: "TST",
        team1FullName: "Test Team",
        team2: "OPP",
        team2FullName: "Opponent",
        team1Score: 3,
        team2Score: 0,
        matchDate: new Date("2024-06-01"),
        tournamentId: 1,
        vods: [],
      } as never,
    ]);

    const testLayer = OpponentStrengthServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const result = await Effect.runPromise(
      OpponentStrengthService.pipe(
        Effect.flatMap((svc) => svc.getTeamStrengthPercentile("TST"))
      ).pipe(Effect.provide(testLayer))
    );

    expect(result).not.toBeNaN();
    if (result !== null) {
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    }
  });
});

// ---------------------------------------------------------------------------
// Team shared data service parity
// ---------------------------------------------------------------------------
import {
  getTeamRoster,
  getBaseTeamData,
  getExtendedTeamData,
} from "@/data/team-shared-data";
import {
  TeamSharedDataService,
  TeamSharedDataServiceLive,
} from "@/data/team/shared-data-service";

describe("Team shared data service parity", () => {
  const mockMapRecords = [
    {
      id: 1,
      name: "Lijiang Tower",
      mapData: [{ id: 10 }, { id: 11 }],
    },
    {
      id: 2,
      name: "Numbani",
      mapData: [{ id: 20 }],
    },
  ];

  const mockPlayerStats = [
    {
      player_name: "Alice",
      player_team: "Team A",
      MapDataId: 10,
      player_hero: "Ana",
      hero_time_played: 600,
      eliminations: 5,
      final_blows: 3,
      deaths: 2,
      offensive_assists: 10,
      hero_damage_dealt: 3000,
      damage_taken: 1500,
      healing_dealt: 8000,
      ultimates_earned: 3,
      ultimates_used: 2,
    },
    {
      player_name: "Bob",
      player_team: "Team A",
      MapDataId: 10,
      player_hero: "Reinhardt",
      hero_time_played: 600,
      eliminations: 8,
      final_blows: 5,
      deaths: 3,
      offensive_assists: 0,
      hero_damage_dealt: 5000,
      damage_taken: 8000,
      healing_dealt: 0,
      ultimates_earned: 2,
      ultimates_used: 2,
    },
    {
      player_name: "Charlie",
      player_team: "Team B",
      MapDataId: 10,
      player_hero: "Genji",
      hero_time_played: 600,
      eliminations: 10,
      final_blows: 7,
      deaths: 4,
      offensive_assists: 0,
      hero_damage_dealt: 7000,
      damage_taken: 3000,
      healing_dealt: 0,
      ultimates_earned: 4,
      ultimates_used: 3,
    },
    {
      player_name: "Alice",
      player_team: "Team A",
      MapDataId: 11,
      player_hero: "Mercy",
      hero_time_played: 600,
      eliminations: 1,
      final_blows: 0,
      deaths: 2,
      offensive_assists: 15,
      hero_damage_dealt: 500,
      damage_taken: 1000,
      healing_dealt: 10000,
      ultimates_earned: 5,
      ultimates_used: 4,
    },
    {
      player_name: "Bob",
      player_team: "Team A",
      MapDataId: 11,
      player_hero: "Winston",
      hero_time_played: 600,
      eliminations: 6,
      final_blows: 4,
      deaths: 5,
      offensive_assists: 0,
      hero_damage_dealt: 4000,
      damage_taken: 7000,
      healing_dealt: 0,
      ultimates_earned: 3,
      ultimates_used: 2,
    },
    {
      player_name: "Alice",
      player_team: "Team A",
      MapDataId: 20,
      player_hero: "Ana",
      hero_time_played: 400,
      eliminations: 3,
      final_blows: 2,
      deaths: 1,
      offensive_assists: 8,
      hero_damage_dealt: 2000,
      damage_taken: 1000,
      healing_dealt: 6000,
      ultimates_earned: 2,
      ultimates_used: 1,
    },
    {
      player_name: "Bob",
      player_team: "Team A",
      MapDataId: 20,
      player_hero: "Reinhardt",
      hero_time_played: 400,
      eliminations: 5,
      final_blows: 3,
      deaths: 2,
      offensive_assists: 0,
      hero_damage_dealt: 3000,
      damage_taken: 5000,
      healing_dealt: 0,
      ultimates_earned: 1,
      ultimates_used: 1,
    },
  ];

  const mockMatchStarts = [
    {
      id: 1,
      MapDataId: 10,
      map_name: "Lijiang Tower",
      map_type: "Control" as const,
      team_1_name: "Team A",
      team_2_name: "Team B",
      match_time: 0,
      scrimId: 1,
      event_type: "match_start" as const,
      round_number: 0,
      objective_index: 0,
    },
    {
      id: 2,
      MapDataId: 11,
      map_name: "Lijiang Tower",
      map_type: "Control" as const,
      team_1_name: "Team A",
      team_2_name: "Team B",
      match_time: 0,
      scrimId: 1,
      event_type: "match_start" as const,
      round_number: 0,
      objective_index: 0,
    },
    {
      id: 3,
      MapDataId: 20,
      map_name: "Numbani",
      map_type: "Hybrid" as const,
      team_1_name: "Team A",
      team_2_name: "Team B",
      match_time: 0,
      scrimId: 1,
      event_type: "match_start" as const,
      round_number: 0,
      objective_index: 0,
    },
  ];

  const mockFinalRounds = [
    {
      id: 1,
      MapDataId: 10,
      round_number: 3,
      match_time: 300,
      scrimId: 1,
      event_type: "round_end" as const,
      team_1_score: 2,
      team_2_score: 1,
      objective_index: 0,
      capturing_team: null,
    },
    {
      id: 2,
      MapDataId: 11,
      round_number: 2,
      match_time: 200,
      scrimId: 1,
      event_type: "round_end" as const,
      team_1_score: 2,
      team_2_score: 0,
      objective_index: 0,
      capturing_team: null,
    },
    {
      id: 3,
      MapDataId: 20,
      round_number: 4,
      match_time: 400,
      scrimId: 1,
      event_type: "round_end" as const,
      team_1_score: 3,
      team_2_score: 2,
      objective_index: 0,
      capturing_team: null,
    },
  ];

  it("getTeamRoster returns same roster from player stats across maps", async () => {
    // First call for roster itself, second call for base data
    prisma.map.findMany.mockResolvedValue(mockMapRecords as never);
    prisma.playerStat.findMany.mockResolvedValue(mockPlayerStats as never);

    const oldResult = await getTeamRoster(1);

    const testLayer = TeamSharedDataServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      TeamSharedDataService.pipe(
        Effect.flatMap((svc) => svc.getTeamRoster(1))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult.sort()).toEqual(oldResult.sort());
  });

  it("getTeamRoster returns empty array when no maps exist", async () => {
    prisma.map.findMany.mockResolvedValue([] as never);

    const oldResult = await getTeamRoster(999);

    const testLayer = TeamSharedDataServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      TeamSharedDataService.pipe(
        Effect.flatMap((svc) => svc.getTeamRoster(999))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult).toEqual(oldResult);
    expect(newResult).toEqual([]);
  });

  it("getBaseTeamData returns same structure with mock data", async () => {
    prisma.map.findMany.mockResolvedValue(mockMapRecords as never);
    prisma.playerStat.findMany.mockResolvedValue(mockPlayerStats as never);
    prisma.matchStart.findMany.mockResolvedValue(mockMatchStarts as never);
    prisma.roundEnd.findMany.mockResolvedValue(mockFinalRounds as never);
    prisma.objectiveCaptured.findMany.mockResolvedValue([] as never);
    prisma.payloadProgress.findMany.mockResolvedValue([] as never);
    prisma.pointProgress.findMany.mockResolvedValue([] as never);

    const oldResult = await getBaseTeamData(1);

    const testLayer = TeamSharedDataServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      TeamSharedDataService.pipe(
        Effect.flatMap((svc) => svc.getBaseTeamData(1))
      ).pipe(Effect.provide(testLayer))
    );

    // Compare scalar fields (Set is not structurally comparable)
    expect(newResult.teamId).toEqual(oldResult.teamId);
    expect(newResult.teamRoster.sort()).toEqual(oldResult.teamRoster.sort());
    expect(newResult.mapDataIds.sort()).toEqual(oldResult.mapDataIds.sort());
    expect(newResult.mapDataRecords).toEqual(oldResult.mapDataRecords);
    expect(newResult.allPlayerStats).toEqual(oldResult.allPlayerStats);
    expect(newResult.matchStarts).toEqual(oldResult.matchStarts);
    expect(newResult.finalRounds).toEqual(oldResult.finalRounds);
    expect(newResult.captures).toEqual(oldResult.captures);
    expect(newResult.payloadProgresses).toEqual(oldResult.payloadProgresses);
    expect(newResult.pointProgresses).toEqual(oldResult.pointProgresses);
  });

  it("getBaseTeamData returns empty structure when no maps", async () => {
    prisma.map.findMany.mockResolvedValue([] as never);
    prisma.playerStat.findMany.mockResolvedValue([] as never);

    const oldResult = await getBaseTeamData(999);

    const testLayer = TeamSharedDataServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      TeamSharedDataService.pipe(
        Effect.flatMap((svc) => svc.getBaseTeamData(999))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult.teamId).toEqual(oldResult.teamId);
    expect(newResult.teamRoster).toEqual(oldResult.teamRoster);
    expect(newResult.mapDataRecords).toEqual(oldResult.mapDataRecords);
    expect(newResult.mapDataIds).toEqual(oldResult.mapDataIds);
    expect(newResult.allPlayerStats).toEqual(oldResult.allPlayerStats);
    expect(newResult.matchStarts).toEqual(oldResult.matchStarts);
  });

  it("getExtendedTeamData returns same result with kills/rezzes/ults", async () => {
    const mockKills = [
      {
        id: 1,
        scrimId: 1,
        event_type: "kill" as const,
        match_time: 50,
        MapDataId: 10,
        attacker_team: "Team A",
        attacker_name: "Alice",
        attacker_hero: "Ana",
        victim_team: "Team B",
        victim_name: "Charlie",
        victim_hero: "Genji",
        event_ability: "Biotic Rifle",
        event_damage: 70,
        is_critical_hit: false,
        is_environmental: false,
        round_number: 1,
        objective_index: 0,
        attacker_x: 0,
        attacker_y: 0,
        attacker_z: 0,
        victim_x: 0,
        victim_y: 0,
        victim_z: 0,
      },
    ];
    const mockRezzes = [
      {
        id: 1,
        scrimId: 1,
        event_type: "mercy_rez" as const,
        match_time: 60,
        MapDataId: 10,
        resurrecter_team: "Team A",
        resurrecter_player: "Alice",
        resurrecter_hero: "Mercy",
        resurrectee_team: "Team A",
        resurrectee_player: "Bob",
        resurrectee_hero: "Reinhardt",
        round_number: 1,
        objective_index: 0,
      },
    ];
    const mockUltimates = [
      {
        id: 1,
        scrimId: 1,
        event_type: "ultimate_start" as const,
        match_time: 70,
        MapDataId: 10,
        player_team: "Team A",
        player_name: "Alice",
        player_hero: "Ana",
        ultimate_id: 1,
        round_number: 1,
        objective_index: 0,
      },
    ];

    prisma.map.findMany.mockResolvedValue(mockMapRecords as never);
    prisma.playerStat.findMany.mockResolvedValue(mockPlayerStats as never);
    prisma.matchStart.findMany.mockResolvedValue(mockMatchStarts as never);
    prisma.roundEnd.findMany.mockResolvedValue(mockFinalRounds as never);
    prisma.objectiveCaptured.findMany.mockResolvedValue([] as never);
    prisma.payloadProgress.findMany.mockResolvedValue([] as never);
    prisma.pointProgress.findMany.mockResolvedValue([] as never);
    prisma.kill.findMany.mockResolvedValue(mockKills as never);
    prisma.mercyRez.findMany.mockResolvedValue(mockRezzes as never);
    prisma.ultimateStart.findMany.mockResolvedValue(mockUltimates as never);

    const oldResult = await getExtendedTeamData(1);

    const testLayer = TeamSharedDataServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      TeamSharedDataService.pipe(
        Effect.flatMap((svc) => svc.getExtendedTeamData(1))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult.teamId).toEqual(oldResult.teamId);
    expect(newResult.teamRoster.sort()).toEqual(oldResult.teamRoster.sort());
    expect(newResult.allKills).toEqual(oldResult.allKills);
    expect(newResult.allRezzes).toEqual(oldResult.allRezzes);
    expect(newResult.allUltimates).toEqual(oldResult.allUltimates);
  });
});

// ---------------------------------------------------------------------------
// Team stats service parity
// ---------------------------------------------------------------------------
import {
  getTeamWinrates,
  getTopMapsByPlaytime,
  getTeamNameForRoster,
} from "@/data/team-stats-dto";
import {
  TeamStatsService,
  TeamStatsServiceLive,
} from "@/data/team/stats-service";

describe("Team stats service parity", () => {
  it("getTeamWinrates returns zeroed structure with empty data", async () => {
    prisma.map.findMany.mockResolvedValue([] as never);
    prisma.playerStat.findMany.mockResolvedValue([] as never);

    const oldResult = await getTeamWinrates(999);

    const testLayer = TeamStatsServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      TeamStatsService.pipe(
        Effect.flatMap((svc) => svc.getTeamWinrates(999))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult).toEqual(oldResult);
    expect(newResult.overallWins).toBe(0);
    expect(newResult.overallLosses).toBe(0);
    expect(newResult.overallWinrate).toBe(0);
    expect(newResult.byMap).toEqual({});
  });

  it("getTeamWinrates computes same winrates with Control map data", async () => {
    const mapRecords = [
      { id: 1, name: "Lijiang Tower", mapData: [{ id: 10 }] },
    ];
    const playerStats = [
      {
        player_name: "Alice",
        player_team: "Team A",
        MapDataId: 10,
        player_hero: "Ana",
        hero_time_played: 600,
        eliminations: 5,
        final_blows: 3,
        deaths: 2,
        offensive_assists: 10,
        hero_damage_dealt: 3000,
        damage_taken: 1500,
        healing_dealt: 8000,
        ultimates_earned: 3,
        ultimates_used: 2,
      },
      {
        player_name: "Bob",
        player_team: "Team A",
        MapDataId: 10,
        player_hero: "Reinhardt",
        hero_time_played: 600,
        eliminations: 8,
        final_blows: 5,
        deaths: 3,
        offensive_assists: 0,
        hero_damage_dealt: 5000,
        damage_taken: 8000,
        healing_dealt: 0,
        ultimates_earned: 2,
        ultimates_used: 2,
      },
      {
        player_name: "Eve",
        player_team: "Team B",
        MapDataId: 10,
        player_hero: "Genji",
        hero_time_played: 600,
        eliminations: 10,
        final_blows: 7,
        deaths: 4,
        offensive_assists: 0,
        hero_damage_dealt: 7000,
        damage_taken: 3000,
        healing_dealt: 0,
        ultimates_earned: 4,
        ultimates_used: 3,
      },
    ];
    const matchStarts = [
      {
        id: 1,
        MapDataId: 10,
        map_name: "Lijiang Tower",
        map_type: "Control" as const,
        team_1_name: "Team A",
        team_2_name: "Team B",
        match_time: 0,
        scrimId: 1,
        event_type: "match_start" as const,
        round_number: 0,
        objective_index: 0,
      },
    ];
    const finalRounds = [
      {
        id: 1,
        MapDataId: 10,
        round_number: 3,
        match_time: 300,
        scrimId: 1,
        event_type: "round_end" as const,
        team_1_score: 2,
        team_2_score: 1,
        objective_index: 0,
        capturing_team: null,
      },
    ];

    prisma.map.findMany.mockResolvedValue(mapRecords as never);
    prisma.playerStat.findMany.mockResolvedValue(playerStats as never);
    prisma.matchStart.findMany.mockResolvedValue(matchStarts as never);
    prisma.roundEnd.findMany.mockResolvedValue(finalRounds as never);
    prisma.objectiveCaptured.findMany.mockResolvedValue([] as never);
    prisma.payloadProgress.findMany.mockResolvedValue([] as never);
    prisma.pointProgress.findMany.mockResolvedValue([] as never);

    const oldResult = await getTeamWinrates(1);

    const testLayer = TeamStatsServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      TeamStatsService.pipe(
        Effect.flatMap((svc) => svc.getTeamWinrates(1))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult).toEqual(oldResult);
  });

  it("getTopMapsByPlaytime returns same sorted results", async () => {
    const mapRecords = [
      { id: 1, name: "Lijiang Tower", mapData: [{ id: 10 }] },
      { id: 2, name: "Numbani", mapData: [{ id: 20 }] },
    ];
    const matchEnds = [
      { match_time: 600, MapDataId: 10 },
      { match_time: 400, MapDataId: 20 },
    ];

    prisma.map.findMany.mockResolvedValue(mapRecords as never);
    prisma.matchEnd.findMany.mockResolvedValue(matchEnds as never);

    const oldResult = await getTopMapsByPlaytime(1);

    const testLayer = TeamStatsServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      TeamStatsService.pipe(
        Effect.flatMap((svc) => svc.getTopMapsByPlaytime(1))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult).toEqual(oldResult);
    expect(newResult[0].name).toBe("Lijiang Tower");
    expect(newResult[0].playtime).toBe(600);
  });

  it("getTeamNameForRoster returns same team name", async () => {
    // Roster setup: Alice and Bob are the team
    const mapRecords = [{ mapData: [{ id: 10 }] }];
    const rosterPlayerStats = [
      { player_name: "Alice", player_team: "Team A", MapDataId: 10 },
      { player_name: "Bob", player_team: "Team A", MapDataId: 10 },
      { player_name: "Eve", player_team: "Team B", MapDataId: 10 },
    ];
    const distinctStats = [
      { player_name: "Alice", player_team: "Team A" },
      { player_name: "Bob", player_team: "Team A" },
      { player_name: "Eve", player_team: "Team B" },
    ];

    // Mock for getTeamRoster (called by both old and new)
    prisma.map.findMany.mockResolvedValue(mapRecords as never);
    prisma.playerStat.findMany
      .mockResolvedValueOnce(rosterPlayerStats as never) // old: getTeamRoster
      .mockResolvedValueOnce(distinctStats as never) // old: getTeamNameForRoster
      .mockResolvedValueOnce(rosterPlayerStats as never) // new: getTeamRoster
      .mockResolvedValueOnce(distinctStats as never); // new: getTeamNameForRoster

    const oldResult = await getTeamNameForRoster(1, 10);

    const testLayer = TeamStatsServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      TeamStatsService.pipe(
        Effect.flatMap((svc) => svc.getTeamNameForRoster(1, 10))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult).toEqual(oldResult);
    expect(newResult).toBe("Team A");
  });
});

// ---------------------------------------------------------------------------
// Scrim service (expanded) — kills, deaths, stats, winrates
// ---------------------------------------------------------------------------
import {
  getAllKillsForPlayer,
  getAllDeathsForPlayer,
  getAllStatsForPlayer,
  getAllMapWinratesForPlayer,
} from "@/data/scrim-dto";

describe("Scrim service expanded parity", () => {
  const mockScrimsMaps = [
    {
      id: 1,
      maps: [{ mapData: [{ id: 10 }] }],
      date: new Date("2024-06-01"),
    },
  ];

  const mockKills = [
    {
      id: 1,
      scrimId: 1,
      event_type: "kill" as const,
      match_time: 100,
      MapDataId: 10,
      attacker_team: "Team A",
      attacker_name: "Alice",
      attacker_hero: "Ana",
      victim_team: "Team B",
      victim_name: "Bob",
      victim_hero: "Genji",
      event_ability: "Biotic Rifle",
      event_damage: 70,
      is_critical_hit: false,
      is_environmental: false,
      round_number: 1,
      objective_index: 0,
      attacker_x: 0,
      attacker_y: 0,
      attacker_z: 0,
      victim_x: 0,
      victim_y: 0,
      victim_z: 0,
    },
    {
      id: 2,
      scrimId: 1,
      event_type: "kill" as const,
      match_time: 150,
      MapDataId: 10,
      attacker_team: "Team B",
      attacker_name: "Bob",
      attacker_hero: "Genji",
      victim_team: "Team A",
      victim_name: "Alice",
      victim_hero: "Ana",
      event_ability: "Dragonblade",
      event_damage: 120,
      is_critical_hit: false,
      is_environmental: false,
      round_number: 1,
      objective_index: 0,
      attacker_x: 0,
      attacker_y: 0,
      attacker_z: 0,
      victim_x: 0,
      victim_y: 0,
      victim_z: 0,
    },
  ];

  it("getAllKillsForPlayer returns same kills", async () => {
    prisma.scrim.findMany.mockResolvedValue(mockScrimsMaps as never);
    // Only Alice's kills (attacker_name = Alice)
    prisma.kill.findMany.mockResolvedValue([mockKills[0]] as never);

    const oldResult = await getAllKillsForPlayer([1], "Alice");

    prisma.scrim.findMany.mockResolvedValue(mockScrimsMaps as never);
    prisma.kill.findMany.mockResolvedValue([mockKills[0]] as never);

    const testLayer = ScrimServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      ScrimService.pipe(
        Effect.flatMap((svc) => svc.getAllKillsForPlayer([1], "Alice"))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult).toEqual(oldResult);
  });

  it("getAllDeathsForPlayer returns same deaths", async () => {
    prisma.scrim.findMany.mockResolvedValue(mockScrimsMaps as never);
    // Alice's deaths (victim_name = Alice)
    prisma.kill.findMany.mockResolvedValue([mockKills[1]] as never);

    const oldResult = await getAllDeathsForPlayer([1], "Alice");

    prisma.scrim.findMany.mockResolvedValue(mockScrimsMaps as never);
    prisma.kill.findMany.mockResolvedValue([mockKills[1]] as never);

    const testLayer = ScrimServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      ScrimService.pipe(
        Effect.flatMap((svc) => svc.getAllDeathsForPlayer([1], "Alice"))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult).toEqual(oldResult);
  });

  it("getAllStatsForPlayer returns same results from raw SQL mock", async () => {
    const mockRawStats = [
      {
        id: 100,
        scrimId: 1,
        event_type: "player_stat",
        match_time: 600,
        MapDataId: 10,
        player_name: "Alice",
        player_team: "Team A",
        player_hero: "Ana",
        hero_time_played: 600,
        eliminations: 5,
        final_blows: 3,
        deaths: 2,
        all_damage_dealt: 4000,
        barrier_damage_dealt: 500,
        hero_damage_dealt: 3000,
        healing_dealt: 8000,
        healing_received: 1000,
        self_healing: 200,
        damage_taken: 1500,
        damage_blocked: 0,
        defensive_assists: 5,
        offensive_assists: 10,
        ultimates_earned: 3,
        ultimates_used: 2,
        multikill_best: 0,
        multikills: 0,
        solo_kills: 1,
        objective_kills: 2,
        environmental_kills: 0,
        environmental_deaths: 0,
        critical_hits: 10,
        critical_hit_accuracy: 25,
        scoped_accuracy: 50,
        scoped_critical_hit_accuracy: 15,
        scoped_critical_hit_kills: 1,
        shots_fired: 100,
        shots_hit: 50,
        shots_missed: 50,
        scoped_shots_fired: 60,
        scoped_shots_hit: 30,
        weapon_accuracy: 50,
        round_number: 3,
        objective_index: 0,
      },
    ];

    prisma.scrim.findMany.mockResolvedValue(mockScrimsMaps as never);
    (prisma.$queryRaw as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockRawStats
    );

    const oldResult = await getAllStatsForPlayer([1], "Alice");

    prisma.scrim.findMany.mockResolvedValue(mockScrimsMaps as never);
    (prisma.$queryRaw as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockRawStats
    );

    const testLayer = ScrimServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      ScrimService.pipe(
        Effect.flatMap((svc) => svc.getAllStatsForPlayer([1], "Alice"))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult).toEqual(oldResult);
  });

  it("getAllMapWinratesForPlayer returns same winrates for Control map", async () => {
    const scrimsWithDate = [
      {
        id: 1,
        maps: [{ mapData: [{ id: 10 }] }],
        date: new Date("2024-06-01"),
      },
    ];
    const matchStarts = [
      {
        id: 1,
        MapDataId: 10,
        map_name: "Lijiang Tower",
        map_type: "Control" as const,
        team_1_name: "Team A",
        team_2_name: "Team B",
        match_time: 0,
        scrimId: 1,
        event_type: "match_start" as const,
        round_number: 0,
        objective_index: 0,
      },
    ];
    const roundEnds = [
      {
        id: 1,
        MapDataId: 10,
        round_number: 3,
        match_time: 300,
        scrimId: 1,
        event_type: "round_end" as const,
        team_1_score: 2,
        team_2_score: 1,
        objective_index: 0,
        capturing_team: null,
      },
    ];
    const playerStatsForWinrate = [
      {
        id: 100,
        scrimId: 1,
        event_type: "player_stat",
        match_time: 300,
        MapDataId: 10,
        player_name: "Alice",
        player_team: "Team A",
        player_hero: "Ana",
        hero_time_played: 300,
        eliminations: 5,
        final_blows: 3,
        deaths: 2,
        all_damage_dealt: 4000,
        barrier_damage_dealt: 500,
        hero_damage_dealt: 3000,
        healing_dealt: 8000,
        healing_received: 1000,
        self_healing: 200,
        damage_taken: 1500,
        damage_blocked: 0,
        defensive_assists: 5,
        offensive_assists: 10,
        ultimates_earned: 3,
        ultimates_used: 2,
        multikill_best: 0,
        multikills: 0,
        solo_kills: 1,
        objective_kills: 2,
        environmental_kills: 0,
        environmental_deaths: 0,
        critical_hits: 10,
        critical_hit_accuracy: 25,
        scoped_accuracy: 50,
        scoped_critical_hit_accuracy: 15,
        scoped_critical_hit_kills: 1,
        shots_fired: 100,
        shots_hit: 50,
        shots_missed: 50,
        scoped_shots_fired: 60,
        scoped_shots_hit: 30,
        weapon_accuracy: 50,
        round_number: 3,
        objective_index: 0,
      },
    ];

    // Old DTO calls
    prisma.scrim.findMany.mockResolvedValue(scrimsWithDate as never);
    prisma.matchStart.findMany.mockResolvedValue(matchStarts as never);
    prisma.roundEnd.findMany.mockResolvedValue(roundEnds as never);
    prisma.objectiveCaptured.findMany.mockResolvedValue([] as never);
    prisma.payloadProgress.findMany.mockResolvedValue([] as never);
    prisma.pointProgress.findMany.mockResolvedValue([] as never);
    prisma.playerStat.findMany.mockResolvedValue(
      playerStatsForWinrate as never
    );

    const oldResult = await getAllMapWinratesForPlayer([1], "Alice");

    // New Effect service calls (same mocks)
    prisma.scrim.findMany.mockResolvedValue(scrimsWithDate as never);
    prisma.matchStart.findMany.mockResolvedValue(matchStarts as never);
    prisma.roundEnd.findMany.mockResolvedValue(roundEnds as never);
    prisma.objectiveCaptured.findMany.mockResolvedValue([] as never);
    prisma.payloadProgress.findMany.mockResolvedValue([] as never);
    prisma.pointProgress.findMany.mockResolvedValue([] as never);
    prisma.playerStat.findMany.mockResolvedValue(
      playerStatsForWinrate as never
    );

    const testLayer = ScrimServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      ScrimService.pipe(
        Effect.flatMap((svc) => svc.getAllMapWinratesForPlayer([1], "Alice"))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult).toEqual(oldResult);
    expect(newResult.length).toBe(1);
    expect(newResult[0].map).toBe("Lijiang Tower");
    // Team A won (score 2-1) and Alice is on Team A
    expect(newResult[0].wins).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Player service parity
// ---------------------------------------------------------------------------
import { getMostPlayedHeroes } from "@/data/player-dto";
import { PlayerService, PlayerServiceLive } from "@/data/player/player-service";

vi.mock("@/lib/map-data-resolver", () => ({
  resolveMapDataId: vi.fn(async (id: number) => id),
}));

describe("Player service parity", () => {
  const mockHeroStats = [
    {
      player_name: "Alice",
      player_team: "Team A",
      player_hero: "Ana",
      hero_time_played: 600,
    },
    {
      player_name: "Bob",
      player_team: "Team A",
      player_hero: "Reinhardt",
      hero_time_played: 500,
    },
    {
      player_name: "Charlie",
      player_team: "Team B",
      player_hero: "Genji",
      hero_time_played: 400,
    },
  ];

  it("getMostPlayedHeroes returns same results", async () => {
    prisma.mapData.findFirst.mockResolvedValue({ id: 10 } as never);
    prisma.playerStat.findMany.mockResolvedValue(mockHeroStats as never);

    const oldResult = await getMostPlayedHeroes(10);

    prisma.mapData.findFirst.mockResolvedValue({ id: 10 } as never);
    prisma.playerStat.findMany.mockResolvedValue(mockHeroStats as never);

    const testLayer = PlayerServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      PlayerService.pipe(
        Effect.flatMap((svc) => svc.getMostPlayedHeroes(10))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult).toEqual(oldResult);
  });

  it("getMostPlayedHeroes returns empty array for empty data", async () => {
    prisma.mapData.findFirst.mockResolvedValue({ id: 99 } as never);
    prisma.playerStat.findMany.mockResolvedValue([] as never);

    const oldResult = await getMostPlayedHeroes(99);

    prisma.mapData.findFirst.mockResolvedValue({ id: 99 } as never);
    prisma.playerStat.findMany.mockResolvedValue([] as never);

    const testLayer = PlayerServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      PlayerService.pipe(
        Effect.flatMap((svc) => svc.getMostPlayedHeroes(99))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult).toEqual(oldResult);
    expect(newResult).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Map group service parity
// ---------------------------------------------------------------------------
import { getMapGroupsForTeam, getMapGroupById } from "@/data/map-group-dto";
import { MapGroupService, MapGroupServiceLive } from "@/data/map/group-service";

describe("Map group service parity", () => {
  const mockMapGroups = [
    {
      id: 1,
      name: "Control Maps",
      description: "All control maps",
      teamId: 1,
      mapIds: [1, 2, 3],
      category: "mode",
      createdBy: "user-1",
      createdAt: new Date("2024-06-01"),
      updatedAt: new Date("2024-06-01"),
    },
    {
      id: 2,
      name: "Escort Maps",
      description: "All escort maps",
      teamId: 1,
      mapIds: [4, 5],
      category: "mode",
      createdBy: "user-1",
      createdAt: new Date("2024-05-01"),
      updatedAt: new Date("2024-05-01"),
    },
  ];

  it("getMapGroupsForTeam returns same results", async () => {
    prisma.mapGroup.findMany.mockResolvedValue(mockMapGroups as never);

    const oldResult = await getMapGroupsForTeam(1);

    prisma.mapGroup.findMany.mockResolvedValue(mockMapGroups as never);

    const testLayer = MapGroupServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      MapGroupService.pipe(
        Effect.flatMap((svc) => svc.getMapGroupsForTeam(1))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult).toEqual(oldResult);
  });

  it("getMapGroupsForTeam returns empty array for team with no groups", async () => {
    prisma.mapGroup.findMany.mockResolvedValue([] as never);

    const oldResult = await getMapGroupsForTeam(999);

    prisma.mapGroup.findMany.mockResolvedValue([] as never);

    const testLayer = MapGroupServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      MapGroupService.pipe(
        Effect.flatMap((svc) => svc.getMapGroupsForTeam(999))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult).toEqual(oldResult);
    expect(newResult).toEqual([]);
  });

  it("getMapGroupById returns same result", async () => {
    prisma.mapGroup.findUnique.mockResolvedValue(mockMapGroups[0] as never);

    const oldResult = await getMapGroupById(1);

    prisma.mapGroup.findUnique.mockResolvedValue(mockMapGroups[0] as never);

    const testLayer = MapGroupServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      MapGroupService.pipe(
        Effect.flatMap((svc) => svc.getMapGroupById(1))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult).toEqual(oldResult);
  });

  it("getMapGroupById returns null for non-existent group", async () => {
    prisma.mapGroup.findUnique.mockResolvedValue(null);

    const oldResult = await getMapGroupById(999);

    prisma.mapGroup.findUnique.mockResolvedValue(null);

    const testLayer = MapGroupServiceLive.pipe(
      Layer.provide(
        Layer.merge(
          Logger.replace(Logger.defaultLogger, TestLogger),
          Layer.empty
        )
      )
    );

    const newResult = await Effect.runPromise(
      MapGroupService.pipe(
        Effect.flatMap((svc) => svc.getMapGroupById(999))
      ).pipe(Effect.provide(testLayer))
    );

    expect(newResult).toEqual(oldResult);
    expect(newResult).toBeNull();
  });
});

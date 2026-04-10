import type {
  Kill,
  MatchStart,
  MercyRez,
  ObjectiveCaptured,
  PayloadProgress,
  PointProgress,
  RoundEnd,
  UltimateStart,
} from "@prisma/client";

export type BaseTeamData = {
  teamId: number;
  teamRoster: string[];
  teamRosterSet: Set<string>;
  mapDataRecords: {
    id: number;
    name: string | null;
    Scrim?: {
      id: number;
      name: string;
      date: Date;
    };
  }[];
  mapDataIds: number[];
  allPlayerStats: {
    player_name: string;
    player_team: string;
    player_hero: string;
    hero_time_played: number;
    MapDataId: number | null;
    eliminations: number;
    final_blows: number;
    deaths: number;
    offensive_assists: number;
    hero_damage_dealt: number;
    damage_taken: number;
    healing_dealt: number;
    ultimates_earned: number;
    ultimates_used: number;
  }[];
  matchStarts: MatchStart[];
  finalRounds: RoundEnd[];
  captures: ObjectiveCaptured[];
  payloadProgresses: PayloadProgress[];
  pointProgresses: PointProgress[];
};

export type ExtendedTeamData = BaseTeamData & {
  allKills: Kill[];
  allRezzes: MercyRez[];
  allUltimates: UltimateStart[];
};

export type TeamDateRange = {
  from: Date;
  to: Date;
};

export function findTeamNameForMapInMemory(
  mapDataId: number,
  allPlayerStats: {
    player_name: string;
    player_team: string;
    MapDataId: number | null;
  }[],
  teamRosterSet: Set<string>
): string | null {
  const teamCounts = new Map<string, number>();

  for (const stat of allPlayerStats) {
    if (stat.MapDataId === mapDataId && teamRosterSet.has(stat.player_name)) {
      const currentCount = teamCounts.get(stat.player_team) ?? 0;
      teamCounts.set(stat.player_team, currentCount + 1);
    }
  }

  let maxCount = 0;
  let teamName: string | null = null;

  for (const [team, count] of teamCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      teamName = team;
    }
  }

  return teamName;
}

export function buildFinalRoundMap(
  finalRounds: RoundEnd[]
): Map<number, RoundEnd> {
  const finalRoundMap = new Map<number, RoundEnd>();

  for (const round of finalRounds) {
    const mapDataId = round.MapDataId;
    if (mapDataId) {
      const existing = finalRoundMap.get(mapDataId);
      if (!existing || round.round_number > existing.round_number) {
        finalRoundMap.set(mapDataId, round);
      }
    }
  }

  return finalRoundMap;
}

export function buildMatchStartMap(
  matchStarts: MatchStart[]
): Map<number, MatchStart> {
  const matchStartMap = new Map<number, MatchStart>();

  for (const match of matchStarts) {
    if (match.MapDataId) {
      matchStartMap.set(match.MapDataId, match);
    }
  }

  return matchStartMap;
}

export function buildCapturesMaps(
  captures: ObjectiveCaptured[],
  matchStartMap: Map<number, MatchStart>
): {
  team1CapturesMap: Map<number, ObjectiveCaptured[]>;
  team2CapturesMap: Map<number, ObjectiveCaptured[]>;
} {
  const team1CapturesMap = new Map<number, ObjectiveCaptured[]>();
  const team2CapturesMap = new Map<number, ObjectiveCaptured[]>();

  for (const capture of captures) {
    const mapDataId = capture.MapDataId;
    if (!mapDataId) continue;

    const match = matchStartMap.get(mapDataId);
    if (!match) continue;

    if (capture.capturing_team === match.team_1_name) {
      if (!team1CapturesMap.has(mapDataId)) {
        team1CapturesMap.set(mapDataId, []);
      }
      team1CapturesMap.get(mapDataId)!.push(capture);
    } else if (capture.capturing_team === match.team_2_name) {
      if (!team2CapturesMap.has(mapDataId)) {
        team2CapturesMap.set(mapDataId, []);
      }
      team2CapturesMap.get(mapDataId)!.push(capture);
    }
  }

  return { team1CapturesMap, team2CapturesMap };
}

export function buildProgressMaps<
  T extends {
    MapDataId: number | null;
    capturing_team: string;
  },
>(
  progressRows: T[],
  matchStartMap: Map<number, MatchStart>
): {
  team1ProgressMap: Map<number, T[]>;
  team2ProgressMap: Map<number, T[]>;
} {
  const team1ProgressMap = new Map<number, T[]>();
  const team2ProgressMap = new Map<number, T[]>();

  for (const progressRow of progressRows) {
    const mapDataId = progressRow.MapDataId;
    if (!mapDataId) continue;

    const match = matchStartMap.get(mapDataId);
    if (!match) continue;

    if (progressRow.capturing_team === match.team_1_name) {
      if (!team1ProgressMap.has(mapDataId)) {
        team1ProgressMap.set(mapDataId, []);
      }
      team1ProgressMap.get(mapDataId)!.push(progressRow);
    } else if (progressRow.capturing_team === match.team_2_name) {
      if (!team2ProgressMap.has(mapDataId)) {
        team2ProgressMap.set(mapDataId, []);
      }
      team2ProgressMap.get(mapDataId)!.push(progressRow);
    }
  }

  return { team1ProgressMap, team2ProgressMap };
}

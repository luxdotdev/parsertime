import type { MapType } from "@/generated/prisma/client";
import type {
  FaceitMatchDetail,
  FaceitMatchStats,
  FaceitMatchStatsRound,
  FaceitMatchStatsTeam,
  FaceitVotingEntity,
} from "./faceit-client";

type Faction = "faction1" | "faction2";

export type NormalizedFaceitTeam = {
  side: 1 | 2;
  faction: Faction;
  faceitTeamId: string | null;
  name: string;
  avatar: string | null;
  type: string | null;
  score: number;
  winner: boolean;
};

export type NormalizedFaceitHeroBan = {
  heroGuid: string | null;
  heroName: string;
  role: string | null;
  banOrder: number;
  bannedByFaction: number | null;
  source: string;
  rawEntity: FaceitVotingEntity | null;
};

export type NormalizedFaceitMapTeamStats = {
  teamSide: 1 | 2;
  faceitTeamId: string | null;
  teamName: string;
  score: number | null;
  won: boolean | null;
  eliminations: number | null;
  deaths: number | null;
  finalBlows: number | null;
  objectiveTime: number | null;
  timePlayed: number | null;
  rawStats: Record<string, string | number | null>;
};

export type NormalizedFaceitMapPlayerStats = {
  teamSide: 1 | 2;
  faceitPlayerId: string;
  nickname: string;
  role: string | null;
  result: number | null;
  eliminations: number | null;
  assists: number | null;
  deaths: number | null;
  finalBlows: number | null;
  soloKills: number | null;
  multiKills: number | null;
  environmentalKills: number | null;
  damageDealt: number | null;
  healingDone: number | null;
  damageMitigated: number | null;
  objectiveTime: number | null;
  timePlayed: number | null;
  rawStats: Record<string, string | number | null>;
};

export type NormalizedFaceitMap = {
  gameNumber: number;
  mapGuid: string | null;
  mapName: string | null;
  mapType: MapType | null;
  attackingFirstFaction: string | null;
  winnerFaction: number | null;
  winnerFaceitTeamId: string | null;
  team1Score: number | null;
  team2Score: number | null;
  scoreSummary: string | null;
  played: boolean | null;
  rawRoundStats: Record<string, string | number | null> | null;
  rawDetailedResult:
    | NonNullable<FaceitMatchDetail["detailed_results"]>[number]
    | null;
  heroBans: NormalizedFaceitHeroBan[];
  teamStats: NormalizedFaceitMapTeamStats[];
  playerStats: NormalizedFaceitMapPlayerStats[];
};

export type NormalizedFaceitScoutingSnapshot = {
  teams: NormalizedFaceitTeam[];
  maps: NormalizedFaceitMap[];
};

function factionForSide(side: 1 | 2): Faction {
  return side === 1 ? "faction1" : "faction2";
}

function sideForFaction(faction: string | null | undefined): 1 | 2 | null {
  if (faction === "faction1") return 1;
  if (faction === "faction2") return 2;
  return null;
}

function entityId(entity: FaceitVotingEntity): string | null {
  return (
    entity.guid ??
    entity.game_map_id ??
    entity.game_heroes_id ??
    entity.game_attacking_first_id ??
    entity.id ??
    null
  );
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toInt(value: unknown): number | null {
  const n = toFiniteNumber(value);
  return n === null ? null : Math.trunc(n);
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;
  if (typeof value === "string") {
    const s = value.toLowerCase();
    if (s === "true" || s === "yes" || s === "win") return true;
    if (s === "false" || s === "no" || s === "loss") return false;
  }
  return null;
}

function normalizeMapType(value: unknown): MapType | null {
  if (typeof value !== "string") return null;
  switch (value.toLowerCase()) {
    case "clash":
      return "Clash";
    case "control":
      return "Control";
    case "escort":
      return "Escort";
    case "flashpoint":
      return "Flashpoint";
    case "hybrid":
      return "Hybrid";
    case "push":
      return "Push";
    default:
      return null;
  }
}

function roleFromEntity(entity: FaceitVotingEntity): string | null {
  const roleTag = entity.filters?.voting_tags?.find((tag) =>
    tag.startsWith("role:")
  );
  return roleTag?.slice("role:".length) ?? null;
}

function mapTypeFromEntity(entity: FaceitVotingEntity | null): MapType | null {
  const tag = entity?.filters?.voting_tags?.find((t) => t.startsWith("cat:"));
  return normalizeMapType(tag?.slice("cat:".length));
}

function votePickAt(pick: unknown, index: number): unknown {
  if (!Array.isArray(pick)) return null;
  return pick[index] ?? null;
}

function stringPickAt(pick: unknown, index: number): string | null {
  const value = votePickAt(pick, index);
  return typeof value === "string" ? value : null;
}

function teamById(
  teams: NormalizedFaceitTeam[],
  faceitTeamId: string | null | undefined
): NormalizedFaceitTeam | null {
  if (!faceitTeamId) return null;
  return teams.find((team) => team.faceitTeamId === faceitTeamId) ?? null;
}

function teamByStats(
  teams: NormalizedFaceitTeam[],
  team: FaceitMatchStatsTeam
): NormalizedFaceitTeam | null {
  const byId = teamById(teams, team.team_id);
  if (byId) return byId;
  const name = team.team_stats?.Team;
  if (typeof name === "string") {
    return teams.find((t) => t.name === name) ?? null;
  }
  return null;
}

function pickedIdsForRound(pick: unknown, index: number): Set<string> | null {
  const value = votePickAt(pick, index);
  if (!Array.isArray(value)) return null;
  return new Set(value.filter((id): id is string => typeof id === "string"));
}

function buildHeroBans(
  match: FaceitMatchDetail,
  gameIndex: number
): NormalizedFaceitHeroBan[] {
  const heroVote = match.voting?.heroes;
  const entities = heroVote?.entities ?? [];
  const pickedIds = pickedIdsForRound(heroVote?.pick, gameIndex);
  if (!pickedIds || entities.length === 0) return [];

  return entities
    .filter((entity) => {
      const id = entityId(entity);
      return id ? !pickedIds.has(id) : false;
    })
    .map((entity, index) => ({
      heroGuid: entityId(entity),
      heroName:
        entity.name ?? entity.class_name ?? entityId(entity) ?? "Unknown",
      role: roleFromEntity(entity),
      banOrder: index + 1,
      bannedByFaction: null,
      source: "voting_missing_pick",
      rawEntity: entity,
    }));
}

function mapEntityByGuid(
  match: FaceitMatchDetail,
  guid: string | null
): FaceitVotingEntity | null {
  if (!guid) return null;
  return (
    match.voting?.map?.entities?.find((entity) => entityId(entity) === guid) ??
    null
  );
}

function normalizeTeams(match: FaceitMatchDetail): NormalizedFaceitTeam[] {
  return ([1, 2] as const).map((side) => {
    const faction = factionForSide(side);
    const team = match.teams?.[faction];
    const score = match.results?.score?.[faction] ?? 0;
    return {
      side,
      faction,
      faceitTeamId: team?.faction_id ?? null,
      name: team?.name ?? faction,
      avatar: team?.avatar ?? null,
      type: team?.type ?? null,
      score,
      winner: match.results?.winner === faction,
    };
  });
}

function buildMapTeamStats(
  teams: NormalizedFaceitTeam[],
  round: FaceitMatchStatsRound | undefined
): NormalizedFaceitMapTeamStats[] {
  return (round?.teams ?? []).flatMap((teamStats) => {
    const team = teamByStats(teams, teamStats);
    if (!team || !teamStats.team_stats) return [];
    const raw = teamStats.team_stats;
    return {
      teamSide: team.side,
      faceitTeamId: team.faceitTeamId,
      teamName: team.name,
      score: toInt(raw["Team Score"]),
      won: toBoolean(raw["Team Win"] ?? raw["Team Win Count"]),
      eliminations: toInt(raw["Team Total Eliminations"]),
      deaths: toInt(raw["Team Total Deaths"]),
      finalBlows: toInt(raw["Total Team Final Blows"]),
      objectiveTime: toFiniteNumber(raw["Total Team Objective Time"]),
      timePlayed: toFiniteNumber(raw["Total Team Time Played"]),
      rawStats: raw,
    };
  });
}

function buildMapPlayerStats(
  teams: NormalizedFaceitTeam[],
  round: FaceitMatchStatsRound | undefined
): NormalizedFaceitMapPlayerStats[] {
  return (round?.teams ?? []).flatMap((teamStats) => {
    const team = teamByStats(teams, teamStats);
    if (!team) return [];
    return (teamStats.players ?? []).flatMap((player) => {
      if (!player.player_id || !player.nickname || !player.player_stats) {
        return [];
      }
      const raw = player.player_stats;
      return {
        teamSide: team.side,
        faceitPlayerId: player.player_id,
        nickname: player.nickname,
        role: typeof raw.Role === "string" ? raw.Role : null,
        result: toInt(raw.Result),
        eliminations: toInt(raw.Eliminations),
        assists: toInt(raw.Assists),
        deaths: toInt(raw.Deaths),
        finalBlows: toInt(raw["Final Blows"]),
        soloKills: toInt(raw["Solo Kills"]),
        multiKills: toInt(raw["Multi Kills"]),
        environmentalKills: toInt(raw["Environmental Kills"]),
        damageDealt: toFiniteNumber(raw["Damage Dealt"]),
        healingDone: toFiniteNumber(raw["Healing Done"]),
        damageMitigated: toFiniteNumber(raw["Damage Mitigated"]),
        objectiveTime: toFiniteNumber(raw["Objective Time"]),
        timePlayed: toFiniteNumber(raw["Time Played"]),
        rawStats: raw,
      };
    });
  });
}

function mapCount(
  match: FaceitMatchDetail,
  stats: FaceitMatchStats | null
): number {
  return Math.max(
    stats?.rounds?.length ?? 0,
    match.detailed_results?.length ?? 0,
    Array.isArray(match.voting?.map?.pick) ? match.voting.map.pick.length : 0,
    Array.isArray(match.voting?.attacking_first?.pick)
      ? match.voting.attacking_first.pick.length
      : 0,
    Array.isArray(match.voting?.heroes?.pick)
      ? match.voting.heroes.pick.length
      : 0
  );
}

export function buildFaceitScoutingSnapshot(
  match: FaceitMatchDetail,
  stats: FaceitMatchStats | null
): NormalizedFaceitScoutingSnapshot {
  const teams = normalizeTeams(match);
  const maps: NormalizedFaceitMap[] = [];

  for (let index = 0; index < mapCount(match, stats); index++) {
    const round = stats?.rounds?.[index];
    const rawRoundStats = round?.round_stats ?? null;
    const detailedResult = match.detailed_results?.[index] ?? null;
    const mapGuid =
      (typeof rawRoundStats?.Map === "string" ? rawRoundStats.Map : null) ??
      stringPickAt(match.voting?.map?.pick, index);
    const mapEntity = mapEntityByGuid(match, mapGuid);
    const winnerTeamId =
      typeof rawRoundStats?.Winner === "string" ? rawRoundStats.Winner : null;
    const winnerByTeamId = teamById(teams, winnerTeamId);
    const winnerFaction =
      winnerByTeamId?.side ?? sideForFaction(detailedResult?.winner) ?? null;
    const mapType =
      normalizeMapType(rawRoundStats?.["OW2 Mode"]) ??
      mapTypeFromEntity(mapEntity);

    maps.push({
      gameNumber: index + 1,
      mapGuid,
      mapName: mapEntity?.name ?? mapEntity?.class_name ?? null,
      mapType,
      attackingFirstFaction: stringPickAt(
        match.voting?.attacking_first?.pick,
        index
      ),
      winnerFaction,
      winnerFaceitTeamId: winnerTeamId,
      team1Score:
        toInt(detailedResult?.factions?.faction1?.score) ??
        toInt(
          round?.teams?.find((t) => teamByStats(teams, t)?.side === 1)
            ?.team_stats?.["Team Score"]
        ),
      team2Score:
        toInt(detailedResult?.factions?.faction2?.score) ??
        toInt(
          round?.teams?.find((t) => teamByStats(teams, t)?.side === 2)
            ?.team_stats?.["Team Score"]
        ),
      scoreSummary:
        typeof rawRoundStats?.["Score Summary"] === "string"
          ? rawRoundStats["Score Summary"]
          : null,
      played: toBoolean(round?.played),
      rawRoundStats,
      rawDetailedResult: detailedResult,
      heroBans: buildHeroBans(match, index),
      teamStats: buildMapTeamStats(teams, round),
      playerStats: buildMapPlayerStats(teams, round),
    });
  }

  return { teams, maps };
}

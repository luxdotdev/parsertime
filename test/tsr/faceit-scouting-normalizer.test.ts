import { describe, expect, it } from "vitest";
import { buildFaceitScoutingSnapshot } from "@/lib/tsr/scouting-normalizer";
import type {
  FaceitMatchDetail,
  FaceitMatchStats,
} from "@/lib/tsr/faceit-client";

const match: FaceitMatchDetail = {
  match_id: "1-test",
  competition_id: "champ-1",
  competition_type: "championship",
  competition_name: "OWCS Test",
  organizer_id: "f0e8a591-08fd-4619-9d59-d97f0571842e",
  region: "GLOBAL",
  status: "finished",
  best_of: 3,
  finished_at: 1780019533,
  results: {
    winner: "faction1",
    score: { faction1: 2, faction2: 0 },
  },
  detailed_results: [
    {
      winner: "faction1",
      factions: { faction1: { score: 2 }, faction2: { score: 1 } },
    },
    {
      winner: "faction2",
      factions: { faction1: { score: 0 }, faction2: { score: 1 } },
    },
  ],
  teams: {
    faction1: {
      name: "Extinction",
      faction_id: "team-ext",
      type: "premade",
      roster: [{ player_id: "p1", nickname: "pdkk_" }],
    },
    faction2: {
      name: "Disguised",
      faction_id: "team-dsg",
      type: "premade",
      roster: [{ player_id: "p2", nickname: "pge4" }],
    },
  },
  voting: {
    voted_entity_types: ["map", "attacking_first", "heroes"],
    map: {
      entities: [
        {
          guid: "map-control",
          name: "Lijiang Tower",
          filters: { voting_tags: ["cat:Control"] },
        },
        {
          guid: "map-push",
          name: "Esperanca",
          filters: { voting_tags: ["cat:Push"] },
        },
      ],
      pick: ["map-control", "map-push"],
    },
    attacking_first: {
      pick: ["faction1", "faction2"],
    },
    heroes: {
      entities: [
        {
          guid: "hero-dva",
          name: "DVa",
          filters: { voting_tags: ["role:Tank"] },
        },
        {
          guid: "hero-tracer",
          name: "Tracer",
          filters: { voting_tags: ["role:Damage"] },
        },
        {
          guid: "hero-ana",
          name: "Ana",
          filters: { voting_tags: ["role:Support"] },
        },
      ],
      pick: [
        ["hero-dva", "hero-ana"],
        ["hero-tracer", "hero-ana"],
      ],
    },
  },
};

const stats: FaceitMatchStats = {
  rounds: [
    {
      match_round: "1",
      played: "1",
      round_stats: {
        Winner: "team-ext",
        "OW2 Mode": "Control",
        Map: "map-control",
        "Score Summary": "2 / 1",
      },
      teams: [
        {
          team_id: "team-ext",
          team_stats: {
            Team: "Extinction",
            "Team Score": "2",
            "Team Win": "1",
            "Team Total Eliminations": "79",
            "Team Total Deaths": "35",
            "Total Team Final Blows": "30",
            "Total Team Objective Time": "213",
            "Total Team Time Played": "3790",
          },
          players: [
            {
              player_id: "p1",
              nickname: "pdkk_",
              player_stats: {
                Role: "Damage",
                Result: "1",
                Eliminations: "17",
                Assists: "1",
                Deaths: "6",
                "Final Blows": "10",
                "Damage Dealt": "16044",
                "Healing Done": "464",
                "Damage Mitigated": "713",
                "Objective Time": "5",
                "Time Played": "758",
              },
            },
          ],
        },
        {
          team_id: "team-dsg",
          team_stats: {
            Team: "Disguised",
            "Team Score": "1",
            "Team Win": "0",
          },
          players: [],
        },
      ],
    },
    {
      match_round: "2",
      played: "1",
      round_stats: {
        Winner: "team-dsg",
        "OW2 Mode": "Push",
        Map: "map-push",
        "Score Summary": "0 / 1",
      },
      teams: [],
    },
  ],
};

describe("buildFaceitScoutingSnapshot", () => {
  it("normalizes FACEIT teams, maps, indirect hero bans, and player stats", () => {
    const snapshot = buildFaceitScoutingSnapshot(match, stats);

    expect(snapshot.teams).toEqual([
      expect.objectContaining({
        side: 1,
        faceitTeamId: "team-ext",
        name: "Extinction",
        score: 2,
        winner: true,
      }),
      expect.objectContaining({
        side: 2,
        faceitTeamId: "team-dsg",
        name: "Disguised",
        score: 0,
        winner: false,
      }),
    ]);

    expect(snapshot.maps).toHaveLength(2);
    expect(snapshot.maps[0]).toMatchObject({
      gameNumber: 1,
      mapGuid: "map-control",
      mapName: "Lijiang Tower",
      mapType: "Control",
      attackingFirstFaction: "faction1",
      winnerFaction: 1,
      winnerFaceitTeamId: "team-ext",
      team1Score: 2,
      team2Score: 1,
      scoreSummary: "2 / 1",
    });
    expect(snapshot.maps[0].heroBans).toEqual([
      expect.objectContaining({
        heroGuid: "hero-tracer",
        heroName: "Tracer",
        role: "Damage",
        source: "voting_missing_pick",
      }),
    ]);
    expect(snapshot.maps[1].heroBans).toEqual([
      expect.objectContaining({ heroGuid: "hero-dva", heroName: "DVa" }),
    ]);

    expect(snapshot.maps[0].teamStats[0]).toMatchObject({
      teamSide: 1,
      faceitTeamId: "team-ext",
      eliminations: 79,
      deaths: 35,
      finalBlows: 30,
      objectiveTime: 213,
      timePlayed: 3790,
    });
    expect(snapshot.maps[0].playerStats[0]).toMatchObject({
      teamSide: 1,
      faceitPlayerId: "p1",
      nickname: "pdkk_",
      role: "Damage",
      eliminations: 17,
      assists: 1,
      deaths: 6,
      finalBlows: 10,
      damageDealt: 16044,
      healingDone: 464,
      damageMitigated: 713,
      objectiveTime: 5,
      timePlayed: 758,
    });
  });
});

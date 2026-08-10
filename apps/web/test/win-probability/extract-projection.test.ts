import { expect, test, vi } from "vitest";

const {
  matchStart,
  kills,
  rezzes,
  ultCharged,
  ultStart,
  roundStarts,
  roundEnds,
} = vi.hoisted(() => ({
  matchStart: vi.fn().mockResolvedValue({
    map_type: "Control",
    team_1_name: "Alpha",
    team_2_name: "Bravo",
  }),
  kills: vi.fn().mockResolvedValue([
    {
      match_time: 30,
      victim_team: "Bravo",
      victim_name: "Victim",
      victim_hero: "Ana",
      attacker_team: "Alpha",
      attacker_name: "Attacker",
    },
  ]),
  rezzes: vi.fn().mockResolvedValue([
    {
      match_time: 40,
      resurrectee_team: "Bravo",
      resurrectee_player: "Victim",
    },
  ]),
  ultCharged: vi.fn().mockResolvedValue([
    {
      match_time: 50,
      player_team: "Alpha",
      player_name: "Attacker",
      player_hero: "Echo",
      hero_duplicated: "True",
    },
  ]),
  ultStart: vi.fn().mockResolvedValue([
    {
      match_time: 60,
      player_team: "Alpha",
      player_name: "Attacker",
    },
  ]),
  roundStarts: vi.fn().mockResolvedValue([
    {
      round_number: 1,
      match_time: 0,
      capturing_team: "Alpha",
      team_1_score: 0,
      team_2_score: 0,
      objective_index: 0,
    },
  ]),
  roundEnds: vi.fn().mockResolvedValue([
    {
      round_number: 1,
      match_time: 120,
      team_1_score: 1,
      team_2_score: 0,
    },
  ]),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    matchStart: { findFirst: matchStart },
    kill: { findMany: kills },
    mercyRez: { findMany: rezzes },
    ultimateCharged: { findMany: ultCharged },
    ultimateStart: { findMany: ultStart },
    roundStart: { findMany: roundStarts },
    roundEnd: { findMany: roundEnds },
    pointProgress: { findMany: vi.fn().mockResolvedValue([]) },
    payloadProgress: { findMany: vi.fn().mockResolvedValue([]) },
    objectiveCaptured: { findMany: vi.fn().mockResolvedValue([]) },
    setupComplete: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

import { fetchEventLog } from "@/lib/win-probability/training/extract";

test("loads high-volume event tables with narrow projections", async () => {
  const log = await fetchEventLog(42);

  expect(log).toMatchObject({
    team1: "Alpha",
    team2: "Bravo",
    mapWinner: "Alpha",
    kills: [
      {
        time: 30,
        victimTeam: "Bravo",
        victimName: "Victim",
        victimHero: "Ana",
        attackerTeam: "Alpha",
        attackerName: "Attacker",
      },
    ],
    rezzes: [{ time: 40, team: "Bravo", player: "Victim" }],
    ultCharged: [
      {
        time: 50,
        team: "Alpha",
        player: "Attacker",
        hero: "Echo",
        heroDuplicated: true,
      },
    ],
    ultStart: [{ time: 60, team: "Alpha", player: "Attacker" }],
  });
  expect(kills).toHaveBeenCalledWith({
    where: { MapDataId: 42 },
    select: {
      match_time: true,
      victim_team: true,
      victim_name: true,
      victim_hero: true,
      attacker_team: true,
      attacker_name: true,
    },
    orderBy: { match_time: "asc" },
  });
  expect(rezzes.mock.calls[0][0].select).toEqual({
    match_time: true,
    resurrectee_team: true,
    resurrectee_player: true,
  });
  expect(ultCharged.mock.calls[0][0].select).toEqual({
    match_time: true,
    player_team: true,
    player_name: true,
    player_hero: true,
    hero_duplicated: true,
  });
  expect(ultStart.mock.calls[0][0].select).toEqual({
    match_time: true,
    player_team: true,
    player_name: true,
  });
});

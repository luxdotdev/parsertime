import {
  STARTER_SHARE,
  MIN_SAMPLE,
  buildOverview,
  mapWinrates,
  attackDefenseSplit,
  heroBanEnvironment,
  rosterStrength,
  rankRelatedTeams,
  buildRecommendations,
  weightedWinRate,
} from "@/data/faceit/aggregations";
import type {
  FaceitTeamMapRow,
  FaceitTeamMatchRow,
  FaceitRosterPlayer,
} from "@/data/faceit/types";
import { FaceitTier } from "@/generated/prisma/client";
import { describe, expect, it } from "vitest";

function D(iso: string): Date {
  return new Date(iso);
}

function matchRow(
  p: Partial<FaceitTeamMatchRow> & { won: boolean }
): FaceitTeamMatchRow {
  return {
    matchId: Math.random().toString(),
    finishedAt: D("2026-01-01"),
    tier: FaceitTier.OPEN,
    ...p,
  };
}

function mapRow(
  p: Partial<FaceitTeamMapRow> & { won: boolean }
): FaceitTeamMapRow {
  return {
    matchId: "m",
    finishedAt: D("2026-01-01"),
    tier: FaceitTier.OPEN,
    teamSide: 1,
    mapName: "Ilios",
    mapType: "Control",
    attackedFirst: null,
    heroBans: [],
    ...p,
  };
}

describe("faceit aggregations", () => {
  it("computes record, win%, and recent form (most-recent-first)", () => {
    const o = buildOverview([
      matchRow({ won: true, finishedAt: D("2026-01-01") }),
      matchRow({ won: false, finishedAt: D("2026-02-01") }),
      matchRow({ won: true, finishedAt: D("2026-03-01") }),
    ]);
    expect(o.totalMatches).toBe(3);
    expect(o.wins).toBe(2);
    expect(o.losses).toBe(1);
    expect(o.winRate).toBeCloseTo(66.6667, 2);
    expect(o.recentForm).toEqual(["win", "loss", "win"]);
    expect(o.tierCounts.OPEN).toBe(3);
  });

  it("weights recent matches more in weighted winrate (120d half-life)", () => {
    const wr = weightedWinRate([
      { won: false, ageDays: 240 },
      { won: true, ageDays: 0 },
    ]);
    expect(wr).toBeGreaterThan(70);
  });

  it("computes per-map and per-type winrates with a min-sample gate", () => {
    const rows: FaceitTeamMapRow[] = [
      ...Array.from({ length: 4 }, () =>
        mapRow({ won: true, mapName: "Ilios", mapType: "Control" })
      ),
      mapRow({ won: false, mapName: "Ilios", mapType: "Control" }),
      mapRow({ won: false, mapName: "Nepal", mapType: "Control" }),
    ];
    const { byMap, byType } = mapWinrates(rows);
    const ilios = byMap.find((m) => m.key === "Ilios")!;
    expect(ilios.played).toBe(5);
    expect(ilios.won).toBe(4);
    expect(ilios.winRate).toBeCloseTo(80, 4);
    expect(ilios.rated).toBe(true);
    const nepal = byMap.find((m) => m.key === "Nepal")!;
    expect(nepal.rated).toBe(false);
    const control = byType.find((t) => t.key === "Control")!;
    expect(control.played).toBe(6);
  });

  it("splits attack vs defense by attackedFirst", () => {
    const s = attackDefenseSplit([
      mapRow({ won: true, attackedFirst: true }),
      mapRow({ won: false, attackedFirst: true }),
      mapRow({ won: true, attackedFirst: false }),
      mapRow({ won: true, attackedFirst: null }),
    ]);
    expect(s.attackPlayed).toBe(2);
    expect(s.attackWon).toBe(1);
    expect(s.attackWinRate).toBeCloseTo(50, 4);
    expect(s.defensePlayed).toBe(1);
    expect(s.defenseWinRate).toBeCloseTo(100, 4);
  });

  it("computes hero-ban-environment winrate split and delta with min-sample gate", () => {
    const rows: FaceitTeamMapRow[] = [
      ...Array.from({ length: 4 }, (_, i) =>
        mapRow({ won: i === 0, heroBans: ["Sombra"] })
      ),
      ...Array.from({ length: 4 }, () =>
        mapRow({ won: true, heroBans: ["Tracer"] })
      ),
    ];
    const entries = heroBanEnvironment(rows);
    const sombra = entries.find((e) => e.hero === "Sombra")!;
    expect(sombra.bannedPlayed).toBe(4);
    expect(sombra.bannedWon).toBe(1);
    expect(sombra.bannedWinRate).toBeCloseTo(25, 4);
    expect(sombra.notBannedPlayed).toBe(4);
    expect(sombra.notBannedWinRate).toBeCloseTo(100, 4);
    expect(sombra.delta).toBeCloseTo(75, 4);
    expect(sombra.rated).toBe(true);
  });

  it("aggregates roster strength as the mean of rated starters", () => {
    const roster: FaceitRosterPlayer[] = [
      {
        faceitPlayerId: "a",
        nickname: "a",
        battletag: null,
        role: "TANK",
        appearances: 10,
        appearanceShare: 1,
        starter: true,
        fsr: 3000,
        tsr: 3200,
      },
      {
        faceitPlayerId: "b",
        nickname: "b",
        battletag: null,
        role: "DAMAGE",
        appearances: 9,
        appearanceShare: 0.9,
        starter: true,
        fsr: 4000,
        tsr: null,
      },
      {
        faceitPlayerId: "c",
        nickname: "c",
        battletag: null,
        role: "SUPPORT",
        appearances: 1,
        appearanceShare: 0.1,
        starter: false,
        fsr: 9999,
        tsr: 9999,
      },
    ];
    const s = rosterStrength(roster);
    expect(s.fsr).toBe(3500);
    expect(s.fsrCovered).toBe(2);
    expect(s.tsr).toBe(3200);
    expect(s.tsrCovered).toBe(1);
    expect(s.rosterSize).toBe(3);
  });

  it("ranks related teams by shared core, descending", () => {
    const related = rankRelatedTeams([
      { faceitTeamId: "x", name: "X", matchCount: 20, sharedCorePlayers: 4 },
      { faceitTeamId: "y", name: "Y", matchCount: 5, sharedCorePlayers: 5 },
    ]);
    expect(related.map((r) => r.faceitTeamId)).toEqual(["y", "x"]);
  });

  it("builds map and hero-ban recommendations from rated entries", () => {
    const recs = buildRecommendations({
      byMap: [
        {
          key: "Ilios",
          played: 10,
          won: 8,
          winRate: 80,
          weightedWinRate: 80,
          rated: true,
        },
        {
          key: "Nepal",
          played: 10,
          won: 3,
          winRate: 30,
          weightedWinRate: 30,
          rated: true,
        },
        {
          key: "Oasis",
          played: 1,
          won: 0,
          winRate: 0,
          weightedWinRate: 0,
          rated: false,
        },
      ],
      heroBanEnvironment: [
        {
          hero: "Sombra",
          bannedPlayed: 5,
          bannedWon: 1,
          bannedWinRate: 20,
          notBannedPlayed: 5,
          notBannedWon: 4,
          notBannedWinRate: 80,
          delta: 60,
          rated: true,
        },
        {
          hero: "Mercy",
          bannedPlayed: 5,
          bannedWon: 4,
          bannedWinRate: 80,
          notBannedPlayed: 5,
          notBannedWon: 1,
          notBannedWinRate: 20,
          delta: -60,
          rated: true,
        },
      ],
    });
    expect(
      recs.some((r) => r.kind === "map_pick" && r.subject === "Nepal")
    ).toBe(true);
    expect(
      recs.some((r) => r.kind === "map_avoid" && r.subject === "Ilios")
    ).toBe(true);
    expect(
      recs.some((r) => r.kind === "ban_hero" && r.subject === "Sombra")
    ).toBe(true);
    expect(
      recs.some((r) => r.kind === "do_not_ban_hero" && r.subject === "Mercy")
    ).toBe(true);
    expect(recs.some((r) => r.subject === "Oasis")).toBe(false);
    expect(MIN_SAMPLE).toBe(4);
    expect(STARTER_SHARE).toBe(0.5);
  });
});

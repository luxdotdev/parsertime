import {
  computeCorrelation,
  computeScatterPoints,
  toRoleName,
  type PlayerScatterBucket,
  type PlayerScatterStats,
} from "@/lib/team-scatter-stats";
import type { HeroName } from "@/types/heroes";
import { describe, expect, it } from "vitest";

function bucket(
  hero: HeroName,
  timePlayed: number,
  overrides: Partial<Omit<PlayerScatterBucket, "hero" | "timePlayed">> = {}
) {
  return {
    hero,
    timePlayed,
    eliminations: 0,
    final_blows: 0,
    deaths: 0,
    hero_damage_dealt: 0,
    healing_dealt: 0,
    healing_received: 0,
    self_healing: 0,
    damage_taken: 0,
    damage_blocked: 0,
    ultimates_earned: 0,
    ultimates_used: 0,
    solo_kills: 0,
    environmental_kills: 0,
    ...overrides,
  };
}

describe("computeScatterPoints", () => {
  const data: PlayerScatterStats[] = [
    {
      playerName: "Ana1",
      primaryRole: "Support",
      buckets: [
        // 600s = 10 min, 300 final blows -> 300 per 10; 30 deaths -> 30 per 10
        bucket("Ana", 600, { final_blows: 300, deaths: 30 }),
      ],
    },
    {
      playerName: "Genji1",
      primaryRole: "Damage",
      buckets: [
        bucket("Genji", 300, { final_blows: 50, deaths: 10 }),
        bucket("Tracer", 300, { final_blows: 50, deaths: 10 }),
      ],
    },
  ];

  it("aggregates all heroes per-10 when no heroes selected", () => {
    const points = computeScatterPoints(data, "final_blows", "deaths", []);
    expect(points).toHaveLength(2);
    const ana = points.find((p) => p.playerName === "Ana1")!;
    expect(ana.x).toBeCloseTo(300);
    expect(ana.y).toBeCloseTo(30);
    // Genji1: 600s total, 100 final blows -> 100 per 10; 20 deaths -> 20 per 10
    const genji = points.find((p) => p.playerName === "Genji1")!;
    expect(genji.x).toBeCloseTo(100);
    expect(genji.y).toBeCloseTo(20);
  });

  it("restricts buckets and players to the selected heroes", () => {
    const points = computeScatterPoints(
      data,
      "final_blows",
      "deaths",
      ["Genji"] as HeroName[]
    );
    // Ana1 never played Genji -> excluded entirely
    expect(points).toHaveLength(1);
    // Genji1: only the Genji bucket (300s, 50 fb) -> (50/5)*10 = 100
    expect(points[0].playerName).toBe("Genji1");
    expect(points[0].x).toBeCloseTo(100);
    expect(points[0].y).toBeCloseTo(20);
  });

  it("drops players with zero selected playtime", () => {
    const zero: PlayerScatterStats[] = [
      { playerName: "Z", primaryRole: "Tank", buckets: [bucket("Reinhardt", 0, { deaths: 5 })] },
    ];
    expect(computeScatterPoints(zero, "deaths", "deaths", [])).toHaveLength(0);
  });
});

describe("computeCorrelation", () => {
  it("returns null for fewer than 2 points", () => {
    expect(computeCorrelation([])).toBeNull();
    expect(computeCorrelation([{ x: 1, y: 1 }])).toBeNull();
  });

  it("finds a perfect positive line", () => {
    const r = computeCorrelation([
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 5 },
    ])!;
    expect(r.slope).toBeCloseTo(2);
    expect(r.intercept).toBeCloseTo(1);
    expect(r.r).toBeCloseTo(1);
  });

  it("finds a perfect negative correlation", () => {
    const r = computeCorrelation([
      { x: 0, y: 10 },
      { x: 1, y: 8 },
      { x: 2, y: 6 },
    ])!;
    expect(r.r).toBeCloseTo(-1);
  });

  it("returns null when x has no variance", () => {
    expect(
      computeCorrelation([
        { x: 5, y: 1 },
        { x: 5, y: 9 },
      ])
    ).toBeNull();
  });

  it("returns null when y has no variance", () => {
    expect(
      computeCorrelation([
        { x: 1, y: 5 },
        { x: 2, y: 5 },
      ])
    ).toBeNull();
  });
});

describe("toRoleName", () => {
  it("returns the role for tank and support heroes", () => {
    expect(toRoleName("Reinhardt" as HeroName)).toBe("Tank");
    expect(toRoleName("Ana" as HeroName)).toBe("Support");
  });

  it("maps damage and flex heroes to Damage", () => {
    expect(toRoleName("Genji" as HeroName)).toBe("Damage");
  });
});

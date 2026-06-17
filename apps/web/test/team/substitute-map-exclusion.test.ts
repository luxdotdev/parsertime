import { findSubstituteMapIds } from "@/data/team/shared-core";
import { describe, expect, it } from "vitest";

type Stat = {
  player_name: string;
  player_team: string;
  MapDataId: number | null;
};

/**
 * A map where the team `TeamA` fields five core players, and `OppTeam` fields
 * five opponents. `subs` lists names that should be treated as substitutes for
 * `TeamA` (they replace one of the core slots on that map).
 */
function mapStats(mapDataId: number, ourPlayers: string[]): Stat[] {
  return [
    ...ourPlayers.map((player_name) => ({
      player_name,
      player_team: "TeamA",
      MapDataId: mapDataId,
    })),
    ...["o1", "o2", "o3", "o4", "o5"].map((player_name) => ({
      player_name,
      player_team: "OppTeam",
      MapDataId: mapDataId,
    })),
  ];
}

const CORE = ["Tred", "Rokit", "pge", "Lep", "Scyle"];

describe("findSubstituteMapIds", () => {
  const teamRosterSet = new Set([...CORE, "crispy", "KiWii"]);

  it("returns an empty set when no substitutes are marked", () => {
    const stats = [...mapStats(1, CORE), ...mapStats(2, CORE)];
    const excluded = findSubstituteMapIds(
      [1, 2],
      stats,
      teamRosterSet,
      new Set()
    );
    expect(excluded.size).toBe(0);
  });

  it("excludes a map where a substitute played for the team", () => {
    // Map 2 swaps Scyle out for crispy (a marked substitute).
    const stats = [
      ...mapStats(1, CORE),
      ...mapStats(2, ["Tred", "Rokit", "pge", "Lep", "crispy"]),
    ];
    const excluded = findSubstituteMapIds(
      [1, 2],
      stats,
      teamRosterSet,
      new Set(["crispy"])
    );
    expect([...excluded]).toEqual([2]);
  });

  it("keeps maps where the substitute only appeared on the opposing team", () => {
    // crispy shows up, but on OppTeam — not our side, so the map stays.
    const stats = [
      ...mapStats(1, CORE),
      [
        { player_name: "crispy", player_team: "OppTeam", MapDataId: 1 },
      ] as Stat[],
    ].flat();
    const excluded = findSubstituteMapIds(
      [1],
      stats,
      teamRosterSet,
      new Set(["crispy"])
    );
    expect(excluded.size).toBe(0);
  });

  it("excludes every map a substitute touched across the window", () => {
    const stats = [
      ...mapStats(1, ["Tred", "Rokit", "pge", "Lep", "crispy"]),
      ...mapStats(2, CORE),
      ...mapStats(3, ["Tred", "Rokit", "KiWii", "Lep", "Scyle"]),
    ];
    const excluded = findSubstituteMapIds(
      [1, 2, 3],
      stats,
      teamRosterSet,
      new Set(["crispy", "KiWii"])
    );
    expect([...excluded].sort()).toEqual([1, 3]);
  });

  it("ignores stats with a null MapDataId", () => {
    const stats: Stat[] = [
      ...mapStats(1, CORE),
      { player_name: "crispy", player_team: "TeamA", MapDataId: null },
    ];
    const excluded = findSubstituteMapIds(
      [1],
      stats,
      teamRosterSet,
      new Set(["crispy"])
    );
    expect(excluded.size).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { computePushWinner, type PushWinnerInput } from "@/lib/push-winner";

// Axis along x: team1 base near x=0, team2 base near x=100, center at x=50.
function makeInput(
  team1DeepestX: number,
  team2DeepestX: number
): PushWinnerInput {
  return {
    team1Name: "Team1",
    team2Name: "Team2",
    kills: [
      // earliest events define spawn anchors (low match_time, near own base)
      { team: "Team1", x: 2, z: 0, match_time: 1 },
      { team: "Team1", x: 3, z: 0, match_time: 2 },
      { team: "Team1", x: 4, z: 0, match_time: 3 },
      { team: "Team2", x: 98, z: 0, match_time: 1 },
      { team: "Team2", x: 97, z: 0, match_time: 2 },
      { team: "Team2", x: 96, z: 0, match_time: 3 },
      // later pushes (deepest advance toward enemy base)
      { team: "Team1", x: team1DeepestX, z: 0, match_time: 60 },
      { team: "Team2", x: team2DeepestX, z: 0, match_time: 61 },
    ],
  };
}

describe("computePushWinner", () => {
  it("returns null when there are no kills", () => {
    expect(
      computePushWinner({ team1Name: "A", team2Name: "B", kills: [] })
    ).toBeNull();
  });

  it("returns null when a team lacks enough kills to anchor", () => {
    const input: PushWinnerInput = {
      team1Name: "A",
      team2Name: "B",
      kills: [{ team: "A", x: 0, z: 0, match_time: 1 }],
    };
    expect(computePushWinner(input)).toBeNull();
  });

  it("picks the team that pushed deepest toward the enemy base", () => {
    // Team1 reaches x=90 (deep into Team2's side); Team2 only reaches x=40.
    const result = computePushWinner(makeInput(90, 40));
    expect(result?.winner).toBe("Team1");
    expect(result?.margin).toBeGreaterThan(0);
    expect(result?.confidence).toBeGreaterThan(0);
    expect(result?.confidence).toBeLessThanOrEqual(1);
  });

  it("picks the other team when it advances further", () => {
    // Team2 reaches x=10 (deep into Team1's side); Team1 only reaches x=60.
    const result = computePushWinner(makeInput(60, 10));
    expect(result?.winner).toBe("Team2");
  });

  it("ignores kills with non-finite coordinates", () => {
    const input = makeInput(90, 40);
    input.kills.push({
      team: "Team1",
      x: Number.NaN,
      z: Number.NaN,
      match_time: 70,
    });
    expect(computePushWinner(input)?.winner).toBe("Team1");
  });
});

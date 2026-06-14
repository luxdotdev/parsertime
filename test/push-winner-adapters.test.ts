import { describe, expect, it } from "vitest";
import {
  pushInputFromBundle,
  pushInputFromParserData,
} from "@/lib/push-winner-adapters";
import type { ParserData } from "@/types/parser";
import type { PositionalEventBundle } from "@/lib/positional-events";

describe("pushInputFromParserData", () => {
  it("extracts team names and finite attacker positions from kill rows", () => {
    const data = {
      match_start: [["match_start", 0, "Colosseo", "Push", "T1", "T2"]],
      kill: [
        [
          "kill",
          5,
          "T1",
          "a",
          "Tracer",
          "T2",
          "v",
          "Ana",
          "Pulse",
          50,
          "0",
          "0",
          "(10.0, 1.0, 20.0)",
          "(11.0, 1.0, 21.0)",
        ],
        [
          "kill",
          6,
          "T2",
          "b",
          "Ana",
          "T1",
          "w",
          "Tracer",
          "Sleep",
          0,
          "0",
          "0",
          "(90.0, 1.0, 20.0)",
          "(12.0, 1.0, 21.0)",
        ],
      ],
    } as unknown as ParserData;

    const input = pushInputFromParserData(data);
    expect(input).not.toBeNull();
    expect(input?.team1Name).toBe("T1");
    expect(input?.team2Name).toBe("T2");
    expect(input?.kills).toEqual([
      { team: "T1", x: 10, z: 20, match_time: 5 },
      { team: "T2", x: 90, z: 20, match_time: 6 },
    ]);
  });

  it("returns null when no kill has coordinates", () => {
    const data = {
      match_start: [["match_start", 0, "Colosseo", "Push", "T1", "T2"]],
      kill: [
        [
          "kill",
          5,
          "T1",
          "a",
          "Tracer",
          "T2",
          "v",
          "Ana",
          "Pulse",
          50,
          "0",
          "0",
        ],
      ],
    } as unknown as ParserData;
    expect(pushInputFromParserData(data)).toBeNull();
  });
});

describe("pushInputFromBundle", () => {
  it("maps bundle kills to push kills using attacker coords", () => {
    const bundle = {
      matchStart: {
        team_1_name: "T1",
        team_2_name: "T2",
        map_name: "Colosseo",
        map_type: "Push",
      },
      kills: [
        {
          match_time: 5,
          attacker_name: "a",
          attacker_team: "T1",
          victim_name: "v",
          victim_team: "T2",
          attacker_x: 10,
          attacker_z: 20,
          victim_x: 11,
          victim_z: 21,
        },
        {
          match_time: 6,
          attacker_name: "b",
          attacker_team: "T2",
          victim_name: "w",
          victim_team: "T1",
          attacker_x: null,
          attacker_z: null,
          victim_x: 12,
          victim_z: 21,
        },
      ],
    } as unknown as PositionalEventBundle;

    const input = pushInputFromBundle(bundle);
    expect(input?.team1Name).toBe("T1");
    expect(input?.kills).toEqual([{ team: "T1", x: 10, z: 20, match_time: 5 }]);
  });

  it("returns null without a matchStart", () => {
    const bundle = {
      matchStart: null,
      kills: [],
    } as unknown as PositionalEventBundle;
    expect(pushInputFromBundle(bundle)).toBeNull();
  });
});

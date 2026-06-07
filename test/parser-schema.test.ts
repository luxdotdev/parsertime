import { parseDataFromTXT } from "@/lib/parser/client";
import { ParserDataSchema } from "@/lib/parser/schema";
import * as fs from "fs";
import { describe, expect, test } from "vitest";

describe("ParserDataSchema coordinates", () => {
  test("accepts old-format rows without coordinates", () => {
    const result = ParserDataSchema.safeParse({
      match_start: [
        [
          "match_start",
          0,
          "Antarctic Peninsula",
          "Control",
          "Team 1",
          "Team 2",
        ],
      ],
      kill: [
        [
          "kill",
          25.38,
          "Team 2",
          "YourDeepRest",
          "Sojourn",
          "Team 1",
          "Jinhyeok",
          "Ramattra",
          "Primary Fire",
          7.58,
          "0",
          "0",
        ],
      ],
      damage: [
        [
          "damage",
          1.22,
          "Team 2",
          "parrot",
          "Zarya",
          "Team 2",
          "parrot",
          "Zarya",
          "Secondary Fire",
          27.5,
          "0",
          "0",
        ],
      ],
      healing: [
        [
          "healing",
          8.26,
          "Team 2",
          "Boop",
          "Moira",
          "Team 2",
          "Nox",
          "Lucio",
          "Primary Fire",
          2.18,
          "0",
        ],
      ],
    });

    expect(result.success).toBe(true);
  });

  test("accepts coordinate-enabled rows emitted by the TXT parser", () => {
    const result = ParserDataSchema.safeParse({
      kill: [
        [
          "kill",
          32.06,
          "Team 2",
          "parrot",
          "Zarya",
          "Team 1",
          "H1dd3n",
          "Lucio",
          "Secondary Fire",
          22.52,
          "0",
          "0",
          0,
          "(6.38, 270.00, 295.06)",
          "(8.44, 271.11, 301.84)",
        ],
      ],
      damage: [
        [
          "damage",
          1.22,
          "Team 2",
          "parrot",
          "Zarya",
          "Team 2",
          "parrot",
          "Zarya",
          "Secondary Fire",
          27.5,
          "0",
          "0",
          "(-51.67, 270.23, 333.79)",
          "(-51.67, 270.23, 333.79)",
        ],
      ],
      healing: [
        [
          "healing",
          8.26,
          "Team 2",
          "Boop",
          "Moira",
          "Team 2",
          "Nox",
          "Lucio",
          "Primary Fire",
          2.18,
          "0",
          "(-18.64, 267.00, 289.82)",
          "(-15.48, 269.41, 294.17)",
        ],
      ],
      ability_1_used: [
        [
          "ability_1_used",
          0.02,
          "Team 1",
          "H1dd3n",
          "Lucio",
          "0",
          "(59.73, 267.58, 340.44)",
        ],
      ],
      ability_2_used: [
        [
          "ability_2_used",
          0.02,
          "Team 1",
          "guard",
          "Symmetra",
          "0",
          "(56.29, 267.59, 336.58)",
        ],
      ],
      ultimate_start: [
        [
          "ultimate_start",
          106.54,
          "Team 2",
          "Boop",
          "Moira",
          "0",
          1,
          "(10.00, 267.00, 290.00)",
        ],
      ],
      ultimate_end: [
        [
          "ultimate_end",
          115.03,
          "Team 2",
          "Boop",
          "Moira",
          "0",
          1,
          "(-13.89, 267.17, 281.55)",
        ],
      ],
    });

    expect(result.success).toBe(true);
  });

  test("accepts non-coordinate trailing artifacts that row writers ignore", () => {
    const result = ParserDataSchema.safeParse({
      ultimate_start: [
        ["ultimate_start", 106.54, "Team 2", "Boop", "Moira", "0", 1, "2}"],
      ],
    });

    expect(result.success).toBe(true);
  });
  test("validates the newest sample fixture", async () => {
    const file = fs.readFileSync(
      "./test/samples/Log-2026-04-15-21-12-58.txt",
      "utf8"
    );

    // @ts-expect-error - cannot pass File type in node
    const parsed = await parseDataFromTXT(file);
    const result = ParserDataSchema.safeParse(parsed);

    expect(result.success).toBe(true);
    expect(parsed.kill).toBeDefined();
    expect(parsed.kill.length).toBeGreaterThan(0);
  });
});

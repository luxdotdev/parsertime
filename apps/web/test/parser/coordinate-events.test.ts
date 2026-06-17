import { vi } from "vitest";

vi.mock("@/lib/prisma", async () => {
  const actual = await import("@/lib/__mocks__/prisma");
  return { default: actual.default };
});

import prismaMock from "@/lib/__mocks__/prisma";
import {
  createAbility1UsedRows,
  createAbility2UsedRows,
  createDamageRows,
  createHealingRows,
  createKillRows,
  createUltimateEndRows,
  createUltimateStartRows,
} from "@/lib/parser";
import type {
  Ability1UsedTableRow,
  Ability2UsedTableRow,
  DamageTableRow,
  HealingTableRow,
  KillTableRow,
  ParserData,
  UltimateEndTableRow,
  UltimateStartTableRow,
} from "@/types/parser";
import { describe, expect, test } from "vitest";

describe("createKillRows with coordinates", () => {
  test("should include coordinates when present", async () => {
    const killRow: KillTableRow = [
      "kill",
      32.06,
      "Team 2",
      "parrot",
      "Zarya",
      "Team 1",
      "H1dd3n",
      "Lúcio",
      "Secondary Fire",
      22.52,
      "0",
      "0",
    ];
    // Append extra field and coordinates (simulating new format)
    const rowWithCoords = [
      ...killRow,
      0,
      "(6.38, 270.00, 295.06)",
      "(8.44, 271.11, 301.84)",
    ];

    const data = { kill: [rowWithCoords] } as unknown as ParserData;

    prismaMock.kill.findMany.mockResolvedValue([]);

    await createKillRows(data, { id: 1 }, 100);

    expect(prismaMock.kill.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          attacker_x: 6.38,
          attacker_y: 270.0,
          attacker_z: 295.06,
          victim_x: 8.44,
          victim_y: 271.11,
          victim_z: 301.84,
        }),
      ],
    });
  });

  test("should have null coordinates for old format kills", async () => {
    const killRow: KillTableRow = [
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
    ];

    const data = { kill: [killRow] } as unknown as ParserData;

    prismaMock.kill.findMany.mockResolvedValue([]);

    await createKillRows(data, { id: 1 }, 100);

    expect(prismaMock.kill.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          attacker_x: null,
          attacker_y: null,
          attacker_z: null,
          victim_x: null,
          victim_y: null,
          victim_z: null,
        }),
      ],
    });
  });
});

describe("createDamageRows with coordinates", () => {
  test("should include coordinates when present", async () => {
    const dmgRow: DamageTableRow = [
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
    ];
    const rowWithCoords = [
      ...dmgRow,
      "(-51.67, 270.23, 333.79)",
      "(-51.67, 270.23, 333.79)",
    ];

    const data = { damage: [rowWithCoords] } as unknown as ParserData;

    prismaMock.damage.findMany.mockResolvedValue([]);

    await createDamageRows(data, { id: 1 }, 100);

    expect(prismaMock.damage.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          attacker_x: -51.67,
          attacker_y: 270.23,
          attacker_z: 333.79,
          victim_x: -51.67,
          victim_y: 270.23,
          victim_z: 333.79,
        }),
      ],
    });
  });

  test("should have null coordinates for old format damage", async () => {
    const dmgRow: DamageTableRow = [
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
    ];

    const data = { damage: [dmgRow] } as unknown as ParserData;

    prismaMock.damage.findMany.mockResolvedValue([]);

    await createDamageRows(data, { id: 1 }, 100);

    expect(prismaMock.damage.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          attacker_x: null,
          attacker_y: null,
          attacker_z: null,
          victim_x: null,
          victim_y: null,
          victim_z: null,
        }),
      ],
    });
  });
});

describe("createHealingRows with coordinates", () => {
  test("should include coordinates when present", async () => {
    const healRow: HealingTableRow = [
      "healing",
      8.26,
      "Team 2",
      "Boop",
      "Moira",
      "Team 2",
      "Nox",
      "Lúcio",
      "Primary Fire",
      2.18,
      "0",
    ];
    const rowWithCoords = [
      ...healRow,
      "(-18.64, 267.00, 289.82)",
      "(-15.48, 269.41, 294.17)",
    ];

    const data = { healing: [rowWithCoords] } as unknown as ParserData;

    prismaMock.healing.findMany.mockResolvedValue([]);

    await createHealingRows(data, { id: 1 }, 100);

    expect(prismaMock.healing.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          healer_x: -18.64,
          healer_y: 267.0,
          healer_z: 289.82,
          healee_x: -15.48,
          healee_y: 269.41,
          healee_z: 294.17,
        }),
      ],
    });
  });
});

describe("createAbility1UsedRows with coordinates", () => {
  test("should include coordinates when present", async () => {
    const abilityRow: Ability1UsedTableRow = [
      "ability_1_used",
      0.02,
      "Team 1",
      "H1dd3n",
      "Lúcio",
      "0",
    ];
    const rowWithCoords = [...abilityRow, "(59.73, 267.58, 340.44)"];

    const data = { ability_1_used: [rowWithCoords] } as unknown as ParserData;

    prismaMock.ability1Used.findMany.mockResolvedValue([]);

    await createAbility1UsedRows(data, { id: 1 }, 100);

    expect(prismaMock.ability1Used.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          player_x: 59.73,
          player_y: 267.58,
          player_z: 340.44,
        }),
      ],
    });
  });

  test("should have null coordinates for old format", async () => {
    const abilityRow: Ability1UsedTableRow = [
      "ability_1_used",
      0.02,
      "Team 1",
      "H1dd3n",
      "Lúcio",
      "0",
    ];

    const data = { ability_1_used: [abilityRow] } as unknown as ParserData;

    prismaMock.ability1Used.findMany.mockResolvedValue([]);

    await createAbility1UsedRows(data, { id: 1 }, 100);

    expect(prismaMock.ability1Used.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          player_x: null,
          player_y: null,
          player_z: null,
        }),
      ],
    });
  });
});

describe("createAbility2UsedRows with coordinates", () => {
  test("should include coordinates when present", async () => {
    const abilityRow: Ability2UsedTableRow = [
      "ability_2_used",
      0.02,
      "Team 1",
      "guard",
      "Symmetra",
      "0",
    ];
    const rowWithCoords = [...abilityRow, "(56.29, 267.59, 336.58)"];

    const data = { ability_2_used: [rowWithCoords] } as unknown as ParserData;

    prismaMock.ability2Used.findMany.mockResolvedValue([]);

    await createAbility2UsedRows(data, { id: 1 }, 100);

    expect(prismaMock.ability2Used.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          player_x: 56.29,
          player_y: 267.59,
          player_z: 336.58,
        }),
      ],
    });
  });
});

describe("createUltimateEndRows with coordinates", () => {
  test("should include coordinates when present", async () => {
    const ultEndRow: UltimateEndTableRow = [
      "ultimate_end",
      115.03,
      "Team 2",
      "Boop",
      "Moira",
      "0",
      1,
    ];
    const rowWithCoords = [...ultEndRow, "(-13.89, 267.17, 281.55)"];

    const data = { ultimate_end: [rowWithCoords] } as unknown as ParserData;

    prismaMock.ultimateEnd.findMany.mockResolvedValue([]);

    await createUltimateEndRows(data, { id: 1 }, 100);

    expect(prismaMock.ultimateEnd.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          player_x: -13.89,
          player_y: 267.17,
          player_z: 281.55,
        }),
      ],
    });
  });

  test("should have null coordinates for old format", async () => {
    const ultEndRow: UltimateEndTableRow = [
      "ultimate_end",
      115.03,
      "Team 2",
      "Boop",
      "Moira",
      "0",
      1,
    ];

    const data = { ultimate_end: [ultEndRow] } as unknown as ParserData;

    prismaMock.ultimateEnd.findMany.mockResolvedValue([]);

    await createUltimateEndRows(data, { id: 1 }, 100);

    expect(prismaMock.ultimateEnd.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          player_x: null,
          player_y: null,
          player_z: null,
        }),
      ],
    });
  });
});

describe("createUltimateStartRows with coordinates", () => {
  test("should include coordinates when present", async () => {
    const ultStartRow: UltimateStartTableRow = [
      "ultimate_start",
      106.54,
      "Team 2",
      "Boop",
      "Moira",
      "0",
      1,
    ];
    const rowWithCoords = [...ultStartRow, "(10.00, 267.00, 290.00)"];

    const data = {
      ultimate_start: [rowWithCoords],
    } as unknown as ParserData;

    prismaMock.ultimateStart.findMany.mockResolvedValue([]);

    await createUltimateStartRows(data, { id: 1 }, 100);

    expect(prismaMock.ultimateStart.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          player_x: 10.0,
          player_y: 267.0,
          player_z: 290.0,
        }),
      ],
    });
  });

  test("should gracefully handle non-coordinate trailing data", async () => {
    // Test data has "2}" as trailing field, not a coordinate
    const ultStartRow: UltimateStartTableRow = [
      "ultimate_start",
      106.54,
      "Team 2",
      "Boop",
      "Moira",
      "0",
      1,
    ];
    const rowWithArtifact = [...ultStartRow, "2}"];

    const data = {
      ultimate_start: [rowWithArtifact],
    } as unknown as ParserData;

    prismaMock.ultimateStart.findMany.mockResolvedValue([]);

    await createUltimateStartRows(data, { id: 1 }, 100);

    expect(prismaMock.ultimateStart.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          player_x: null,
          player_y: null,
          player_z: null,
        }),
      ],
    });
  });
});

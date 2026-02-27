import { vi } from "vitest";

vi.mock("@/lib/prisma", async () => {
  const actual = await import("@/lib/__mocks__/prisma");
  return { default: actual.default };
});

import prismaMock from "@/lib/__mocks__/prisma";
import { createObjectiveCapturedRows } from "@/lib/parser";
import type { ObjectiveCapturedTableRow, ParserData } from "@/types/parser";
import type { ObjectiveCaptured } from "@prisma/client";
import { expect, test } from "vitest";

test("should return the generated objective capture row", async () => {
  const newObjectiveCapturedRow: ObjectiveCapturedTableRow = [
    "objective_captured",
    100,
    1,
    "Team 1",
    1,
    0.01,
    0,
    0,
  ];

  const data: Pick<ParserData, "objective_captured"> = {
    objective_captured: [newObjectiveCapturedRow],
  };

  const expectedRow: ObjectiveCaptured = {
    id: 1,
    scrimId: 1,
    event_type: "objective_captured",
    match_time: 100,
    round_number: 1,
    capturing_team: "Team 1",
    objective_index: 1,
    control_team_1_progress: 0.01,
    control_team_2_progress: 0,
    match_time_remaining: 0,
    MapDataId: 100,
  };

  prismaMock.objectiveCaptured.findMany.mockResolvedValue([expectedRow]);

  const result = await createObjectiveCapturedRows(
    data as never,
    { id: 1 },
    100
  );

  expect(prismaMock.objectiveCaptured.createMany).toHaveBeenCalledWith({
    data: [
      {
        scrimId: 1,
        match_time: 100,
        round_number: 1,
        capturing_team: "Team 1",
        objective_index: 1,
        control_team_1_progress: 0.01,
        control_team_2_progress: 0,
        match_time_remaining: 0,
        MapDataId: 100,
      },
    ],
  });

  expect(result).toEqual([expectedRow]);
});

test("should return empty array", async () => {
  const data = {};

  const result = await createObjectiveCapturedRows(
    data as never,
    { id: 1 },
    1
  );

  expect(result).toEqual([]);
  expect(prismaMock.objectiveCaptured.createMany).not.toHaveBeenCalled();
});

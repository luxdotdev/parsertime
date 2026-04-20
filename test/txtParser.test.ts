import { parseCoordinate, parseDataFromTXT } from "@/lib/parser";
import type { ParserData } from "@/types/parser";
import type { $Enums } from "@prisma/client";
import { fail } from "assert";
import * as fs from "fs";
import { describe, expect, test } from "vitest";
import * as XLSX from "xlsx";

test("should be equivalent to control data", async () => {
  const file = fs.readFileSync(
    "./test/samples/Log-2024-01-22-20-02-45.txt",
    "utf8"
  );

  // @ts-expect-error - cannot pass File type in node
  const workbook1 = await parseDataFromTXT(file);
  const workbook2 = local_parseDataFromXLSX(
    "./test/samples/Log-2024-01-22-20-02-45_parsed.xlsx"
  );

  expect(workbook2).toEqual(workbook1);
});

test("should be equivalent to control data v2", async () => {
  const file = fs.readFileSync(
    "./test/samples/Log-2024-01-22-20-21-43.txt",
    "utf8"
  );

  // @ts-expect-error - cannot pass File type in node
  const workbook1 = await parseDataFromTXT(file);
  const workbook2 = local_parseDataFromXLSX(
    "./test/samples/Log-2024-01-22-20-21-43_parsed.xlsx"
  );

  expect(workbook2).toEqual(workbook1);
});

/**
 * This test checks for echo duplicate events to be handled correctly.
 */
test("should be equivalent to control data v3", async () => {
  const file = fs.readFileSync(
    "./test/samples/Log-2024-01-22-21-35-38.txt",
    "utf8"
  );

  // @ts-expect-error - cannot pass File type in node
  const workbook1 = await parseDataFromTXT(file);
  const workbook2 = local_parseDataFromXLSX(
    "./test/samples/Log-2024-01-22-21-35-38_parsed.xlsx"
  );

  expect(workbook2.echo_duplicate_end).toEqual(workbook1.echo_duplicate_end);
  expect(workbook2.echo_duplicate_start).toEqual(
    workbook1.echo_duplicate_start
  );
});

/**
 * This test is skipped because there is an issue with stats appearing as **** in the control data.
 */
test.todo("should be equivalent to control data v4", async () => {
  const file = fs.readFileSync(
    "./test/samples/Log-2023-12-12-22-15-10.txt",
    "utf8"
  );

  // @ts-expect-error - cannot pass File type in node
  const workbook1 = await parseDataFromTXT(file);
  const workbook2 = local_parseDataFromXLSX(
    "./test/samples/Log-2023-12-12-22-15-10_parsed.xlsx"
  );

  expect(workbook2).toEqual(workbook1);
});

/**
 * This test checks for mercy rez events to be handled correctly.
 */
test("should be equivalent to control data v5", async () => {
  const file = fs.readFileSync(
    "./test/samples/Log-2024-02-05-20-07-38.txt",
    "utf8"
  );

  // @ts-expect-error - cannot pass File type in node
  const workbook1 = await parseDataFromTXT(file);
  const workbook2 = local_parseDataFromXLSX(
    "./test/samples/Log-2024-02-05-20-07-38_parsed.xlsx"
  );

  expect(workbook2.mercy_rez).toEqual(workbook1.mercy_rez);
});

/**
 * This test checks for D.Va events to be handled correctly.
 */
test("should be equivalent to control data v6", async () => {
  const file = fs.readFileSync(
    "./test/samples/Log-2024-01-10-20-38-42.txt",
    "utf8"
  );

  // @ts-expect-error - cannot pass File type in node
  const workbook1 = await parseDataFromTXT(file);
  const workbook2 = local_parseDataFromXLSX(
    "./test/samples/Log-2024-01-10-20-38-42_parsed.xlsx"
  );

  expect(workbook2).toEqual(workbook1);
});

/**
 * This test checks for Echo environmental deaths during ult to be handled correctly.
 */
test("should correctly handle deaths linked to All Teams", async () => {
  const file = fs.readFileSync(
    "./test/samples/Log-2024-05-03-20-06-06.txt",
    "utf8"
  );

  // @ts-expect-error - cannot pass File type in node
  const workbook1 = await parseDataFromTXT(file);

  for (const kill of workbook1.kill) {
    if (kill[2] === "All Teams") {
      fail("All Teams should not be present in kill events");
    }
  }

  expect(workbook1).toBeDefined();
});

/**
 * This test checks for type errors from parsing team names that begin with a number.
 */
test("should pass without errors", async () => {
  const file = fs.readFileSync(
    "./test/samples/Log-2024-06-16-22-24-33.txt",
    "utf8"
  );

  // @ts-expect-error - cannot pass File type in node
  const workbook1 = await parseDataFromTXT(file);
  const workbook2 = local_parseDataFromXLSX(
    "./test/samples/Log-2024-06-16-22-24-33_parsed.xlsx"
  );

  // @kennethmiranda - Please review this test and make sure it is passing.
  // The `round_start` and `round_end` events are currently failing this test case.
  // Once the parser is fixed, this test will pass.
  expect(workbook2.round_start).toEqual(workbook1.round_start);
  expect(workbook2.round_end).toEqual(workbook1.round_end);

  // expect(workbook2).toEqual(workbook1);
});

/**
 * Tests for parsing log files with player coordinates.
 */
describe("coordinate log parsing", () => {
  test("should parse a log file with coordinates without errors", async () => {
    const file = fs.readFileSync(
      "./test/samples/Log-2026-04-02-17-21-48.txt",
      "utf8"
    );

    // @ts-expect-error - cannot pass File type in node
    const result = await parseDataFromTXT(file);

    expect(result).toBeDefined();
    expect(result.kill.length).toBeGreaterThan(0);
    expect(result.damage).toBeDefined();
    expect(result.damage!.length).toBeGreaterThan(0);
    expect(result.healing).toBeDefined();
    expect(result.healing!.length).toBeGreaterThan(0);
    expect(result.ability_1_used).toBeDefined();
    expect(result.ability_1_used!.length).toBeGreaterThan(0);
    expect(result.ability_2_used).toBeDefined();
    expect(result.ability_2_used!.length).toBeGreaterThan(0);
    expect(result.ultimate_end).toBeDefined();
    expect(result.ultimate_end!.length).toBeGreaterThan(0);
    expect(result.ultimate_start).toBeDefined();
    expect(result.ultimate_start!.length).toBeGreaterThan(0);
  });

  test("should preserve coordinate tuples as single elements", async () => {
    const file = fs.readFileSync(
      "./test/samples/Log-2026-04-02-17-21-48.txt",
      "utf8"
    );

    // @ts-expect-error - cannot pass File type in node
    const result = await parseDataFromTXT(file);

    // Kill rows in the new format have 15 elements (13 base + 2 coords)
    const firstKill = result.kill[0] as unknown as unknown[];
    expect(firstKill.length).toBeGreaterThanOrEqual(14);

    // Last two elements should be parseable coordinate strings
    const pos1 = parseCoordinate(firstKill[firstKill.length - 2]);
    const pos2 = parseCoordinate(firstKill[firstKill.length - 1]);
    expect(pos1).not.toBeNull();
    expect(pos2).not.toBeNull();
    expect(pos1).toHaveProperty("x");
    expect(pos1).toHaveProperty("y");
    expect(pos1).toHaveProperty("z");
  });

  test("should keep standard kill fields at correct indices", async () => {
    const file = fs.readFileSync(
      "./test/samples/Log-2026-04-02-17-21-48.txt",
      "utf8"
    );

    // @ts-expect-error - cannot pass File type in node
    const result = await parseDataFromTXT(file);

    const firstKill = result.kill[0];
    expect(firstKill[0]).toBe("kill");
    expect(typeof firstKill[1]).toBe("number"); // match_time
    expect(typeof firstKill[2]).toBe("string"); // attacker_team
  });

  test("should preserve ability coordinate as single element", async () => {
    const file = fs.readFileSync(
      "./test/samples/Log-2026-04-02-17-21-48.txt",
      "utf8"
    );

    // @ts-expect-error - cannot pass File type in node
    const result = await parseDataFromTXT(file);

    // Ability rows have 7 elements (6 base + 1 coord)
    const firstAbility = result.ability_1_used![0] as unknown as unknown[];
    const pos = parseCoordinate(firstAbility[firstAbility.length - 1]);
    expect(pos).not.toBeNull();
    expect(typeof pos!.x).toBe("number");
    expect(typeof pos!.y).toBe("number");
    expect(typeof pos!.z).toBe("number");
  });

  test("should preserve ultimate_end coordinate", async () => {
    const file = fs.readFileSync(
      "./test/samples/Log-2026-04-02-17-21-48.txt",
      "utf8"
    );

    // @ts-expect-error - cannot pass File type in node
    const result = await parseDataFromTXT(file);

    const firstUltEnd = result.ultimate_end![0] as unknown as unknown[];
    const pos = parseCoordinate(firstUltEnd[firstUltEnd.length - 1]);
    expect(pos).not.toBeNull();
  });
});

/**
 * Recent Overwatch log exports censor the "kill" event type to "****".
 * The parser must restore it so kill rows aren't silently dropped.
 */
describe("censored kill event type", () => {
  test("should parse **** event types as kills", async () => {
    const file = fs.readFileSync(
      "./test/samples/Log-2026-04-15-21-12-58.txt",
      "utf8"
    );

    // @ts-expect-error - cannot pass File type in node
    const result = await parseDataFromTXT(file);

    expect(result.kill).toBeDefined();
    expect(result.kill.length).toBeGreaterThan(0);

    for (const kill of result.kill) {
      expect(kill[0]).toBe("kill");
    }
  });

  test("should not emit a '0' event type bucket", async () => {
    const file = fs.readFileSync(
      "./test/samples/Log-2026-04-15-21-12-58.txt",
      "utf8"
    );

    // @ts-expect-error - cannot pass File type in node
    const result = await parseDataFromTXT(file);

    expect((result as unknown as Record<string, unknown>)["0"]).toBeUndefined();
    expect(
      (result as unknown as Record<string, unknown>)["****"]
    ).toBeUndefined();
  });

  test("should rewrite inline censored kill lines", async () => {
    const log = [
      "[00:00:00] ,match_start,0,Antarctic Peninsula,Control,Team 1,Team 2",
      "[00:03:07] ,****,28.43,Team 2,sleepyme,Bastion,Team 1,MomoMiles,Orisa,Secondary Fire,93.14,0,0",
      "[00:03:09] ,****,30.46,Team 1,sun,Lúcio,Team 2,Kloverr,Echo,Primary Fire,4,True,0",
    ].join("\n");

    // @ts-expect-error - cannot pass File type in node
    const result = await parseDataFromTXT(log);

    expect(result.kill.length).toBe(2);
    expect(result.kill[0][0]).toBe("kill");
    expect(result.kill[0][2]).toBe("Team 2");
    expect(result.kill[1][0]).toBe("kill");
    expect(result.kill[1][10]).toBe("True");
  });
});

function local_parseDataFromXLSX(fileName: string) {
  // read the file binary
  const file = fs.readFileSync(fileName, "binary");

  const workbook = XLSX.read(file, { type: "binary" });
  const sheetName = workbook.SheetNames as $Enums.EventType[];

  const result: Partial<ParserData> = {};

  // for each sheet, convert to json and add it to the result object.
  for (const sheet of sheetName) {
    const json = XLSX.utils
      .sheet_to_json(workbook.Sheets[sheet], {
        header: 1,
      })
      .slice(1);
    result[sheet] = json as never; // cast to any because we don't know the exact type
  }

  return result as ParserData; // cast to ParserData because we know the structure matches
}

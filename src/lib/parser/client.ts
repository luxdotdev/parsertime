import { headers } from "@/lib/headers";
import type { ParserData } from "@/types/parser";
import type { $Enums } from "@prisma/client";

const TXT_FILE = "text/plain";

const TEAM_NAME_FIELDS: Record<string, number[]> = {
  ability_1_used: [2],
  ability_2_used: [2],
  damage: [2, 5],
  defensive_assist: [2],
  dva_remech: [2],
  echo_duplicate_end: [2],
  echo_duplicate_start: [2],
  healing: [2, 5],
  hero_spawn: [2],
  hero_swap: [2],
  kill: [2, 5],
  match_start: [4, 5],
  objective_captured: [3],
  offensive_assist: [2],
  payload_progress: [3],
  player_stat: [3],
  point_progress: [3],
  remech_charged: [2],
  ultimate_charged: [2],
  ultimate_end: [2],
  ultimate_start: [2],
  round_end: [3],
  round_start: [3],
};

export const TEAM_POSITIONAL_SWAP_FIELDS: Record<string, [number, number][]> = {
  match_start: [[4, 5]],
  match_end: [[3, 4]],
  objective_captured: [[5, 6]],
  round_end: [
    [4, 5],
    [7, 8],
  ],
  round_start: [[4, 5]],
};

export function normalizeTeamData(
  data: ParserData,
  newTeam1Name: string,
  newTeam2Name: string | null,
  userIsOriginalTeam2: boolean
): ParserData {
  const origTeam1 = String(data.match_start[0][4]);
  const origTeam2 = String(data.match_start[0][5]);

  const result = structuredClone(data);

  if (userIsOriginalTeam2) {
    for (const [eventType, swapPairs] of Object.entries(
      TEAM_POSITIONAL_SWAP_FIELDS
    )) {
      const events = result[eventType as keyof ParserData] as
        | unknown[][]
        | undefined;
      if (!events) continue;
      for (const row of events) {
        for (const [i, j] of swapPairs) {
          [row[i], row[j]] = [row[j], row[i]];
        }
      }
    }
  }

  const nameToReplace1 = userIsOriginalTeam2 ? origTeam2 : origTeam1;
  const nameToReplace2 = userIsOriginalTeam2 ? origTeam1 : origTeam2;

  for (const [eventType, indices] of Object.entries(TEAM_NAME_FIELDS)) {
    const events = result[eventType as keyof ParserData] as
      | unknown[][]
      | undefined;
    if (!events) continue;
    for (const row of events) {
      for (const idx of indices) {
        const val = String(row[idx]);
        if (val === nameToReplace1) {
          row[idx] = newTeam1Name;
        } else if (newTeam2Name !== null && val === nameToReplace2) {
          row[idx] = newTeam2Name;
        }
      }
    }
  }

  return result;
}
export async function parseData(file: File) {
  switch (file.type) {
    case TXT_FILE:
      return await parseDataFromTXT(file);
    default:
      throw new Error("Invalid file type. Upload a .txt replay log.");
  }
}

function cleanInvalidLines(lines: string[][]): string[][] {
  return lines
    .filter((line) => {
      // Remove invalid mercy_rez lines that contain empty values
      if (line[0] === "mercy_rez") {
        // Check if any field (except the first one which is event type) is empty
        return !line.slice(1).some((field) => field === "" || field == null);
      }
      return true;
    })
    .map((line) => {
      return line.map((field, index) => {
        // Recent Overwatch log exports censor the "kill" event type to "****".
        // Restore it before the generic asterisk-to-"0" sanitization below
        // would otherwise drop these rows as an unknown event type.
        if (index === 0 && field === "****") {
          return "kill";
        }
        if (field.includes("*")) {
          return "0";
        }
        return field;
      });
    });
}

export function splitLinePreservingCoords(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let depth = 0;
  for (const ch of line) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

export function parseCoordinate(
  value: unknown
): { x: number; y: number; z: number } | null {
  if (!value || typeof value !== "string") return null;
  const match = value
    .trim()
    .match(/^\(([^,\s]+)\s*,\s*([^,\s]+)\s*,\s*([^)\s]+)\s*\)$/);
  if (!match) return null;
  const x = parseFloat(match[1]);
  const y = parseFloat(match[2]);
  const z = parseFloat(match[3]);
  if (isNaN(x) || isNaN(y) || isNaN(z)) return null;
  return { x, y, z };
}

type ParsedTxtValue = string | number | null | undefined;
type ParsedTxtRow = ParsedTxtValue[];

function normalizeTxtRowForSheetJson(row: ParsedTxtRow): ParsedTxtRow {
  let end = row.length;
  while (end > 0 && row[end - 1] === null) {
    end--;
  }

  const normalized = end === row.length ? row : row.slice(0, end);
  for (let index = 0; index < normalized.length; index++) {
    if (normalized[index] === null) {
      normalized[index] = undefined;
    }
  }

  return normalized;
}

export async function parseDataFromTXT(file: File) {
  const fileContent =
    process.env.NODE_ENV !== "test"
      ? await file?.text()
      : (file as unknown as string);

  const lines = fileContent
    .split("\n")
    .map((line) => splitLinePreservingCoords(line));

  lines.forEach((line) => line.shift());

  const cleanedLines = cleanInvalidLines(lines);

  const stringFieldIndexes: Record<string, number[]> = {
    kill: [3, 4, 6, 7, 8, 10, 11],
    damage: [3, 4, 6, 7, 8, 10, 11],
    healing: [3, 4, 6, 7, 8, 10],
  };

  function convertToNumberOrReplaceEmpty(
    value: string,
    eventType: string,
    index: number
  ) {
    if (value === "") {
      return null;
    }
    if (
      (eventType === "round_end" || eventType === "round_start") &&
      index === 3
    ) {
      if (value === "0") {
        return 0;
      }
      return value;
    }
    if (isTeamNameField(eventType, index)) {
      return value;
    }
    if (stringFieldIndexes[eventType]?.includes(index)) {
      return value;
    }
    const parsedValue = parseFloat(value);
    return isNaN(parsedValue) ? value : parsedValue;
  }

  function isTeamNameField(eventType: string, index: number): boolean {
    return TEAM_NAME_FIELDS[eventType]?.includes(index) || false;
  }

  const categorizedData: Record<string, ParsedTxtRow[]> = {};
  cleanedLines.forEach((line) => {
    const eventType = line[0];
    if (headers[eventType]) {
      if (!categorizedData[eventType]) {
        categorizedData[eventType] = [];
      }
      const convertedLine = line.map((value, index) =>
        convertToNumberOrReplaceEmpty(value, eventType, index)
      );
      categorizedData[eventType].push(
        normalizeTxtRowForSheetJson(convertedLine)
      );
    }
  });

  for (const kill of categorizedData["kill"] ?? []) {
    if (kill[2] === "All Teams") {
      kill[2] = kill[5];
      kill[3] = kill[6];
      kill[4] = kill[7];
    }
  }

  // oxlint-disable-next-line @typescript-eslint/consistent-type-assertions
  const result = {} as ParserData;

  for (const eventType of Object.keys(categorizedData).sort()) {
    result[eventType as $Enums.EventType] = categorizedData[eventType] as never;
  }

  return result;
}

import { headers } from "@/lib/headers";
import type { ParserData } from "@/types/parser";
import { type $Enums, MapType } from "@prisma/client";
import * as XLSX from "xlsx";

const XLSX_FILE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

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

  const [fromTeam1, toTeam1] = userIsOriginalTeam2
    ? [origTeam2, newTeam1Name]
    : [origTeam1, newTeam1Name];

  const [fromTeam2, toTeam2] = userIsOriginalTeam2
    ? [origTeam1, newTeam2Name ?? origTeam1]
    : [origTeam2, newTeam2Name ?? origTeam2];

  const newData = structuredClone(data);

  for (const [eventType, rows] of Object.entries(newData)) {
    const fieldPositions = TEAM_NAME_FIELDS[eventType];
    if (!fieldPositions) continue;

    for (const row of rows as unknown[][]) {
      for (const pos of fieldPositions) {
        if (String(row[pos]) === fromTeam1) {
          row[pos] = toTeam1;
        } else if (String(row[pos]) === fromTeam2) {
          row[pos] = toTeam2;
        }
      }
    }

    const swapPositions = TEAM_POSITIONAL_SWAP_FIELDS[eventType];
    if (swapPositions && userIsOriginalTeam2) {
      for (const row of rows as unknown[][]) {
        for (const [pos1, pos2] of swapPositions) {
          const temp = row[pos1];
          row[pos1] = row[pos2];
          row[pos2] = temp;
        }
      }
    }
  }

  return newData;
}

export async function parseData(file: File) {
  switch (file.type) {
    case XLSX_FILE:
      return await parseDataFromXLSX(file);
    case TXT_FILE:
      return await parseDataFromTXT(file);
    default:
      throw new Error("Invalid file type");
  }
}

function cleanInvalidLines(lines: string[][]): string[][] {
  return lines
    .filter((line) => {
      if (line[0] === "mercy_rez") {
        return !line.slice(1).some((field) => field === "" || field == null);
      }
      return true;
    })
    .map((line) => {
      return line.map((field) => {
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
  const match = value.trim().match(/^\(([^,]+),\s*([^,]+),\s*([^)]+)\)$/);
  if (!match) return null;
  const x = parseFloat(match[1]);
  const y = parseFloat(match[2]);
  const z = parseFloat(match[3]);
  if (isNaN(x) || isNaN(y) || isNaN(z)) return null;
  return { x, y, z };
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
      if (MapType.Control && value === "0") {
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

  const categorizedData: Record<string, string[][]> = {};
  cleanedLines.forEach((line) => {
    const eventType = line[0];
    if (headers[eventType]) {
      if (!categorizedData[eventType]) {
        categorizedData[eventType] = [headers[eventType]];
      }
      const convertedLine = line.map((value, index) =>
        convertToNumberOrReplaceEmpty(value, eventType, index)
      );
      categorizedData[eventType].push(convertedLine as never);
    }
  });

  for (const kill of categorizedData["kill"]) {
    if (kill[2] === "All Teams") {
      kill[2] = kill[5];
      kill[3] = kill[6];
      kill[4] = kill[7];
    }
  }

  const workbook = XLSX.utils.book_new();

  const sortedEventTypes = Object.keys(categorizedData).sort();

  sortedEventTypes.forEach((eventType) => {
    const ws = XLSX.utils.aoa_to_sheet(categorizedData[eventType]);
    XLSX.utils.book_append_sheet(workbook, ws, eventType);
  });

  const sheetName = workbook.SheetNames as $Enums.EventType[];

  // oxlint-disable-next-line @typescript-eslint/consistent-type-assertions
  const result = {} as ParserData;

  for (const sheet of sheetName) {
    const ws = workbook.Sheets[sheet];
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(1);

    result[sheet] = json as never;
  }

  return result;
}

export async function parseDataFromXLSX(file: File) {
  const reader = new FileReader();

  const data = await new Promise((resolve, reject) => {
    reader.onload = (e: ProgressEvent<FileReader>) => resolve(e.target?.result);
    reader.onerror = () => reject(new Error("Failed to read the file."));
    reader.readAsBinaryString(file);
  });

  const workbook = XLSX.read(data, { type: "binary" });
  const sheetName = workbook.SheetNames as $Enums.EventType[];

  // oxlint-disable-next-line @typescript-eslint/consistent-type-assertions
  const result = {} as ParserData;

  for (const sheet of sheetName) {
    const ws = workbook.Sheets[sheet];
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(1);

    // @ts-expect-error - Dynamic assignment
    result[sheet] = json;
  }

  return result;
}

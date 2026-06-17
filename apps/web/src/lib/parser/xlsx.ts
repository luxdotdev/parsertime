import type { ParserData } from "@/types/parser";
import type { $Enums } from "@/generated/prisma/client";

export async function parseDataFromXLSXBinary(data: string | ArrayBuffer) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(data, {
    type: typeof data === "string" ? "binary" : "array",
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
  const data = await file.arrayBuffer();
  return parseDataFromXLSXBinary(data);
}

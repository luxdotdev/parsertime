import { test, expect } from "vitest";
import * as fs from "fs";
import * as XLSX from "xlsx";
import { parseDataFromTXT } from "@/lib/parser";
import { EventType, ParserData } from "@/types/parser";

test("should be equivalent to control data", async () => {
  const file = await fs.readFileSync(
    "./test/samples/Log-2024-01-22-20-02-45.txt",
    "utf8"
  );

  // @ts-expect-error - cannot pass File type in node
  const workbook1 = await parseDataFromTXT(file);
  const workbook2 = await local_parseDataFromXLSX(
    "./test/samples/Log-2024-01-22-20-02-45_parsed.xlsx"
  );

  expect(workbook2).toEqual(workbook1);
});

test("should be equivalent to control data v2", async () => {
  const file = await fs.readFileSync(
    "./test/samples/Log-2024-01-22-20-21-43.txt",
    "utf8"
  );

  // @ts-expect-error - cannot pass File type in node
  const workbook1 = await parseDataFromTXT(file);
  const workbook2 = await local_parseDataFromXLSX(
    "./test/samples/Log-2024-01-22-20-21-43_parsed.xlsx"
  );

  expect(workbook2).toEqual(workbook1);
});

test("should be equivalent to control data v3", async () => {
  const file = await fs.readFileSync(
    "./test/samples/Log-2024-01-22-21-35-38.txt",
    "utf8"
  );

  // @ts-expect-error - cannot pass File type in node
  const workbook1 = await parseDataFromTXT(file);
  const workbook2 = await local_parseDataFromXLSX(
    "./test/samples/Log-2024-01-22-21-35-38_parsed.xlsx"
  );

  expect(workbook2.echo_duplicate_end).toEqual(workbook1.echo_duplicate_end);
  expect(workbook2.echo_duplicate_start).toEqual(
    workbook1.echo_duplicate_start
  );
});

test.todo("should be equivalent to control data v4", async () => {
  const file = await fs.readFileSync(
    "./test/samples/Log-2023-12-12-22-15-10.txt",
    "utf8"
  );

  // @ts-expect-error - cannot pass File type in node
  const workbook1 = await parseDataFromTXT(file);
  const workbook2 = await local_parseDataFromXLSX(
    "./test/samples/Log-2023-12-12-22-15-10_parsed.xlsx"
  );

  expect(workbook2).toEqual(workbook1);
});

async function local_parseDataFromXLSX(fileName: string) {
  // read the file binary
  const file = await fs.readFileSync(fileName, "binary");

  const workbook = XLSX.read(file, { type: "binary" });
  const sheetName = workbook.SheetNames as EventType[];

  const result: Partial<ParserData> = {};

  // for each sheet, convert to json and add it to the result object.
  for (const sheet of sheetName) {
    const json = XLSX.utils
      .sheet_to_json(workbook.Sheets[sheet], {
        header: 1,
      })
      .slice(1);
    result[sheet] = json as any; // cast to any because we don't know the exact type
  }

  return result as ParserData; // cast to ParserData because we know the structure matches
}

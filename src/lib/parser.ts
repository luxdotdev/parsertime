import * as XLSX from "xlsx";
import { EventType, ParserData } from "../../types/parser";

export async function parseData(file: File) {
  const reader = new FileReader();

  const data = await new Promise((resolve, reject) => {
    reader.onload = (e: ProgressEvent<FileReader>) => resolve(e.target?.result);
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });

  const workbook = XLSX.read(data, { type: "binary" });
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

import "server-only";

export {
  normalizeTeamData,
  normalizeWinnerName,
  parseCoordinate,
  parseData,
  parseDataFromTXT,
  splitLinePreservingCoords,
} from "@/lib/parser/client";

export * from "@/lib/parser/persistence";
export * from "@/lib/parser/rows";

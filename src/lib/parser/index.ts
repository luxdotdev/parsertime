import "server-only";

export {
  normalizeTeamData,
  parseCoordinate,
  parseData,
  parseDataFromTXT,
  splitLinePreservingCoords,
} from "@/lib/parser/client";

export * from "@/lib/parser/persistence";
export * from "@/lib/parser/rows";

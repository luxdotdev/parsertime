import type { HeroBan } from "@/components/dashboard/scrim-creator/types";
import type { ParserData } from "@/types/parser";

export type MapUploadStatus =
  | "parsing" // client-side parse in flight
  | "ready" // parsed, waiting for submit
  | "uploading" // sequential upload in flight
  | "done" // persisted server-side
  | "failed"; // upload errored, retryable

export type PendingMap = {
  /** Stable local id (drives React keys and dnd-kit). Not the DB id. */
  id: string;
  /** Monotonic add order, used as a stable tiebreak when sorting. */
  seq: number;
  file: File;
  fileName: string;
  /** Match time parsed from the filename, or null when not present. */
  timestamp: number | null;
  status: MapUploadStatus;
  /** Set once client parsing succeeds. */
  parsedData?: ParserData;
  mapName?: string;
  team1?: string;
  team2?: string;
  /** Parsed event-row count, used to weight the upload progress bar. */
  rowCount: number;
  hasCorruption: boolean;
  /** True when client parsing threw; the row is unusable and removable. */
  parseFailed: boolean;
  heroBans: HeroBan[];
  /** Live upload progress for this map, 0..1, driven by streamed row counts. */
  progress: number;
  /** Populated when status is "failed". */
  error?: string;
};

/** Maximum maps a single bulk upload accepts at once. Not a per-scrim cap;
 * a scrim may hold any number of maps across multiple uploads. */
export const MAX_MAPS_PER_UPLOAD = 10;
export const MAX_FILE_SIZE = 10_000_000; // 10MB

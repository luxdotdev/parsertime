"use client";

import { parseLogText } from "@/lib/parser/client";
import { computePushWinner } from "@/lib/push-winner";
import { pushInputFromParserData } from "@/lib/push-winner-adapters";
import { detectCorruptedData } from "@/lib/utils";
import { Logger } from "@/lib/logger";
import { arrayMove } from "@dnd-kit/sortable";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { HeroBan } from "@/components/dashboard/scrim-creator/types";
import { countParsedRows } from "./count-rows";
import {
  compareByFilenameTimestamp,
  parseLogFilenameTimestamp,
} from "./filename-timestamp";
import {
  isPushMap,
  MAX_FILE_SIZE,
  MAX_MAPS_PER_UPLOAD,
  type PendingMap,
} from "./types";

const TXT = "text/plain";

function makeId() {
  return `map-${Math.random().toString(36).slice(2)}-${performance.now().toString(36)}`;
}

function sortMaps(maps: PendingMap[]): PendingMap[] {
  return [...maps].sort(compareByFilenameTimestamp);
}

export function useBulkMapUpload(maxMaps: number = MAX_MAPS_PER_UPLOAD) {
  const t = useTranslations("bulkUpload");
  const [pendingMaps, setPendingMaps] = useState<PendingMap[]>([]);
  const seqRef = useRef(0);

  const patchMap = useCallback((id: string, patch: Partial<PendingMap>) => {
    setPendingMaps((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );
  }, []);

  const addFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      // Reserve slots up front so we never exceed the cap, even mid-parse.
      let accepted: File[] = [];
      setPendingMaps((prev) => {
        const room = maxMaps - prev.length;
        if (room <= 0) {
          toast.error(t("maxMapsTitle"), {
            description: t("maxMaps", { max: maxMaps }),
          });
          return prev;
        }

        const valid = files.filter((file) => {
          if (file.type !== TXT) {
            toast.error(t("fileTypeTitle"), { description: t("fileType") });
            return false;
          }
          if (file.size > MAX_FILE_SIZE) {
            toast.error(t("fileSizeTitle"), { description: t("fileSize") });
            return false;
          }
          return true;
        });

        accepted = valid.slice(0, room);
        if (valid.length > accepted.length) {
          toast.error(t("maxMapsTitle"), {
            description: t("maxMaps", { max: maxMaps }),
          });
        }

        const placeholders: PendingMap[] = accepted.map((file) => ({
          id: makeId(),
          seq: seqRef.current++,
          file,
          fileName: file.name,
          timestamp: parseLogFilenameTimestamp(file.name),
          status: "parsing",
          rowCount: 0,
          progress: 0,
          hasCorruption: false,
          parseFailed: false,
          heroBans: [],
        }));

        return sortMaps([...prev, ...placeholders]);
      });

      // Parse each accepted file; resolve its row in place as it finishes.
      // Each file emits exactly one structured "wide event" (file metadata,
      // bytes actually read, parsed event/row counts, and outcome) so that an
      // upload which silently produces an unidentifiable map — the reported
      // failure mode — leaves a diagnosable trail instead of a blank row.
      await Promise.all(
        accepted.map(async (file) => {
          const startedAt = performance.now();
          const wideEvent: Record<string, unknown> = {
            operation: "client_parse_map",
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            timestamp: new Date().toISOString(),
          };

          try {
            // Read the file ONCE. A second File.text() (the old path read it
            // again for corruption detection) doubles the exposure to a
            // cloud-synced/placeholder file returning empty or truncated bytes,
            // which is the prime suspect for a log that "parses" to a blank map.
            const text = await file.text();
            wideEvent.bytes_read = text.length;
            wideEvent.read_empty = text.length === 0;

            const parsed = parseLogText(text);
            const corruption = detectCorruptedData(text);

            const mapName = parsed.match_start?.[0]?.[2];
            const rowCount = countParsedRows(parsed);
            const hasMapName = typeof mapName === "string" && mapName.length > 0;

            wideEvent.event_type_count = Object.keys(parsed).length;
            wideEvent.match_start_count = parsed.match_start?.length ?? 0;
            wideEvent.row_count = rowCount;
            wideEvent.has_map_name = hasMapName;
            wideEvent.map_name = hasMapName ? mapName : null;
            wideEvent.has_corruption = corruption.isCorrupted;
            wideEvent.has_invalid_mercy_rez = corruption.hasInvalidMercyRez;
            wideEvent.has_asterisks = corruption.hasAsterisks;

            // Guard: with no match_start the map has no name, image, or teams.
            // It would render as a blank "ready" row and then throw server-side
            // on `data.map.match_start[0]`. Surface it as a parse failure (with
            // a logged reason) instead of a silent, unsubmittable row — this is
            // exactly the state seen in the reported stuck uploads.
            if (!hasMapName) {
              wideEvent.outcome = "no_match_start";
              setPendingMaps((prev) =>
                prev.map((m) =>
                  m.file === file
                    ? { ...m, status: "failed", parseFailed: true }
                    : m
                )
              );
              return;
            }

            // For Push maps, pre-fill the winner with the coordinate
            // algorithm's suggestion so the user only confirms it.
            let winner: string | undefined;
            let winnerSource: "auto_coords" | undefined;
            let suggestedWinner: string | undefined;
            wideEvent.is_push_map = isPushMap(mapName);
            if (isPushMap(mapName)) {
              const input = pushInputFromParserData(parsed);
              const suggestion = input ? computePushWinner(input) : null;
              if (suggestion) {
                winner = suggestion.winner;
                winnerSource = "auto_coords";
                suggestedWinner = suggestion.winner;
              }
              wideEvent.push_winner_resolved = suggestedWinner != null;
            }

            setPendingMaps((prev) =>
              prev.map((m) =>
                m.file === file
                  ? {
                      ...m,
                      status: "ready",
                      parsedData: parsed,
                      rowCount,
                      mapName,
                      team1: parsed.match_start?.[0]?.[4],
                      team2: parsed.match_start?.[0]?.[5],
                      hasCorruption: corruption.isCorrupted,
                      winner,
                      winnerSource,
                      suggestedWinner,
                    }
                  : m
              )
            );
            wideEvent.outcome = "success";
          } catch (e) {
            wideEvent.outcome = "error";
            wideEvent.error = {
              message: e instanceof Error ? e.message : String(e),
              type: e instanceof Error ? e.name : "UnknownError",
            };
            setPendingMaps((prev) =>
              prev.map((m) =>
                m.file === file
                  ? { ...m, status: "failed", parseFailed: true }
                  : m
              )
            );
          } finally {
            wideEvent.duration_ms = Math.round(performance.now() - startedAt);
            Logger.info(wideEvent);
          }
        })
      );
    },
    [maxMaps, t]
  );

  const removeMap = useCallback((id: string) => {
    setPendingMaps((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const reorder = useCallback((activeId: string, overId: string) => {
    setPendingMaps((prev) => {
      const oldIndex = prev.findIndex((m) => m.id === activeId);
      const newIndex = prev.findIndex((m) => m.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const setHeroBans = useCallback(
    (id: string, heroBans: HeroBan[]) => patchMap(id, { heroBans }),
    [patchMap]
  );

  const reset = useCallback(() => {
    setPendingMaps([]);
    seqRef.current = 0;
  }, []);

  const isParsing = pendingMaps.some((m) => m.status === "parsing");
  const usableMaps = pendingMaps.filter((m) => !m.parseFailed);
  const failedCount = pendingMaps.filter((m) => m.status === "failed").length;
  const doneCount = pendingMaps.filter((m) => m.status === "done").length;
  const atCapacity = pendingMaps.length >= maxMaps;

  return {
    pendingMaps,
    setPendingMaps,
    addFiles,
    removeMap,
    reorder,
    setHeroBans,
    patchMap,
    reset,
    isParsing,
    usableMaps,
    failedCount,
    doneCount,
    atCapacity,
    maxMaps,
  };
}

export type BulkMapUpload = ReturnType<typeof useBulkMapUpload>;

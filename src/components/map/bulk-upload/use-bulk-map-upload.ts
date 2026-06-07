"use client";

import { parseData } from "@/lib/parser/client";
import { detectFileCorruption } from "@/lib/utils";
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
import { MAX_FILE_SIZE, MAX_MAPS_PER_UPLOAD, type PendingMap } from "./types";

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
      await Promise.all(
        accepted.map(async (file) => {
          try {
            const [parsed, corruption] = await Promise.all([
              parseData(file),
              detectFileCorruption(file),
            ]);
            setPendingMaps((prev) =>
              prev.map((m) =>
                m.file === file
                  ? {
                      ...m,
                      status: "ready",
                      parsedData: parsed,
                      rowCount: countParsedRows(parsed),
                      mapName: parsed.match_start?.[0]?.[2],
                      team1: parsed.match_start?.[0]?.[4],
                      team2: parsed.match_start?.[0]?.[5],
                      hasCorruption: corruption.isCorrupted,
                    }
                  : m
              )
            );
          } catch {
            setPendingMaps((prev) =>
              prev.map((m) =>
                m.file === file
                  ? { ...m, status: "failed", parseFailed: true }
                  : m
              )
            );
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

"use client";

import { Button } from "@/components/ui/button";
import {
  mapSelectionStore,
  selectHasSelections,
  selectSelectedMapIds,
  selectSelectionCount,
  selectUniqueScrimCount,
} from "@/stores/map-selection-store";
import { useSelector } from "@xstate/store/react";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

type CompareSelectedButtonProps = {
  teamId: number;
};

export function CompareSelectedButton({ teamId }: CompareSelectedButtonProps) {
  const t = useTranslations("scrimPage.compareButton");
  const router = useRouter();

  // Memoize selector functions
  const hasSelectionsSelector = useCallback(
    (state: ReturnType<typeof mapSelectionStore.getSnapshot>) =>
      selectHasSelections(state.context),
    []
  );

  const selectionCountSelector = useCallback(
    (state: ReturnType<typeof mapSelectionStore.getSnapshot>) =>
      selectSelectionCount(state.context),
    []
  );

  const selectedMapIdsSelector = useCallback(
    (state: ReturnType<typeof mapSelectionStore.getSnapshot>) =>
      selectSelectedMapIds(state.context),
    []
  );

  const uniqueScrimCountSelector = useCallback(
    (state: ReturnType<typeof mapSelectionStore.getSnapshot>) =>
      selectUniqueScrimCount(state.context),
    []
  );

  const hasSelections = useSelector(mapSelectionStore, hasSelectionsSelector);
  const selectionCount = useSelector(mapSelectionStore, selectionCountSelector);
  const selectedMapIdsMap = useSelector(
    mapSelectionStore,
    selectedMapIdsSelector
  );
  const uniqueScrimCount = useSelector(
    mapSelectionStore,
    uniqueScrimCountSelector
  );

  // Convert Map to Array of map IDs
  const selectedMapIds = useMemo(
    () => Array.from(selectedMapIdsMap.keys()),
    [selectedMapIdsMap]
  );

  const handleCompare = useCallback(() => {
    const mapIdsParam = selectedMapIds.join(",");
    const url = `/${teamId}/compare?maps=${mapIdsParam}` as Route;
    router.push(url);
  }, [selectedMapIds, teamId, router]);

  const handleClear = useCallback(() => {
    mapSelectionStore.send({ type: "clearAll" });
  }, []);

  if (!hasSelections) return null;

  return (
    <div className="bg-card ring-foreground/10 fixed right-6 bottom-6 z-50 flex items-center gap-2 rounded-lg p-4 shadow-lg ring-1">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {t("selected", { count: selectionCount })}
          </span>
          {uniqueScrimCount > 1 && (
            <span className="text-muted-foreground text-xs">
              {t("fromScrims", { count: uniqueScrimCount })}
            </span>
          )}
        </div>
        <Button onClick={handleCompare} size="sm">
          {t("compare")}
        </Button>
        <Button onClick={handleClear} variant="outline" size="sm">
          {t("clear")}
        </Button>
      </div>
    </div>
  );
}

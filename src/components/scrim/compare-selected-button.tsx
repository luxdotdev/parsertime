"use client";

import { AddToMapGroupDialog } from "@/components/scrim/add-to-map-group-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  mapSelectionStore,
  selectHasSelections,
  selectSelectedMapIds,
  selectSelectionCount,
  selectUniqueScrimCount,
} from "@/stores/map-selection-store";
import { useSelector } from "@xstate/store/react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, FolderPlus } from "lucide-react";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

type CompareSelectedButtonProps = {
  teamId: number;
};

export function CompareSelectedButton({ teamId }: CompareSelectedButtonProps) {
  const t = useTranslations("scrimPage.compareButton");
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [isMapGroupDialogOpen, setIsMapGroupDialogOpen] = useState(false);

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

  const handleAddToMapGroup = useCallback(() => {
    setIsMapGroupDialogOpen(true);
  }, []);

  if (!hasSelections) return null;

  return (
    <>
      <AddToMapGroupDialog
        open={isMapGroupDialogOpen}
        onOpenChange={setIsMapGroupDialogOpen}
        teamId={teamId}
        mapIds={selectedMapIds}
        mapName={`${selectionCount} selected map${selectionCount !== 1 ? "s" : ""}`}
      />
      <motion.div
        className="bg-card ring-foreground/10 fixed inset-x-3 bottom-3 z-50 flex items-center justify-between gap-2 rounded-lg p-4 shadow-lg ring-1 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:justify-start"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
      >
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                {t("compare")}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCompare}>
                {t("compareNow")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddToMapGroup}>
                <FolderPlus className="mr-2 h-4 w-4" />
                {t("addToMapGroup")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleClear}
                className="text-destructive"
              >
                {t("clear")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>
    </>
  );
}

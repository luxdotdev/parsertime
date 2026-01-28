"use client";

import { AddToMapGroupDialog } from "@/components/scrim/add-to-map-group-dialog";
import { ReplayCode } from "@/components/scrim/replay-code";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Link } from "@/components/ui/link";
import { cn, toKebabCase, useMapNames } from "@/lib/utils";
import {
  mapSelectionStore,
  selectIsMapSelected,
} from "@/stores/map-selection-store";
import type { Map } from "@prisma/client";
import { useSelector } from "@xstate/store/react";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { memo, useCallback, useState } from "react";
import { toast } from "sonner";

type MapCardWithSelectionProps = {
  map: Map;
  scrimId: number;
  teamId: number;
  locale: string;
};

function MapCardWithSelectionComponent({
  map,
  scrimId,
  teamId,
}: MapCardWithSelectionProps) {
  const t = useTranslations("scrimPage.mapCard");
  const [isMapGroupDialogOpen, setIsMapGroupDialogOpen] = useState(false);

  // Memoize selector function
  const isSelectedSelector = useCallback(
    (state: ReturnType<typeof mapSelectionStore.getSnapshot>) =>
      selectIsMapSelected(state.context, map.id),
    [map.id]
  );

  const isSelected = useSelector(mapSelectionStore, isSelectedSelector);

  const handleToggleSelection = useCallback(() => {
    mapSelectionStore.send({
      type: "toggleMapSelection",
      mapId: map.id,
      scrimId,
    });
  }, [map.id, scrimId]);

  const handleCopyReplayCode = useCallback(
    (e: Event) => {
      e.preventDefault();
      if (map.replayCode) {
        void navigator.clipboard.writeText(map.replayCode);
        toast.success(t("copiedCode"), {
          description: map.replayCode,
        });
      }
    },
    [map.replayCode, t]
  );

  // Get map display name
  const mapNames = useMapNames();
  const displayName = mapNames.get(toKebabCase(map.name)) ?? map.name;

  const handleAddToMapGroup = useCallback(() => {
    setIsMapGroupDialogOpen(true);
  }, []);

  return (
    <>
      <AddToMapGroupDialog
        open={isMapGroupDialogOpen}
        onOpenChange={setIsMapGroupDialogOpen}
        teamId={teamId}
        mapIds={[map.id]}
        mapName={displayName}
      />
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Card
            className={cn(
              "relative h-48 max-w-md bg-cover transition-all duration-150",
              "ring-foreground/10 shadow-xs ring-1",
              "@media (hover: hover) hover:ring-primary/30 hover:shadow-md",
              isSelected &&
                "ring-primary border-primary border-l-4 shadow-lg ring-2"
            )}
            role="article"
            aria-label={`${displayName} map card${isSelected ? ", selected for comparison" : ""}`}
          >
            <Link
              href={`/${teamId}/scrim/${scrimId}/map/${map.id}` as Route}
              prefetch={true}
            >
              <CardHeader>
                <h3 className="z-10 text-3xl font-semibold tracking-tight text-white">
                  {displayName}
                </h3>
              </CardHeader>
              <CardContent>
                <Image
                  src={`/maps/${toKebabCase(map.name)}.webp`}
                  alt={t("altText", { map: displayName })}
                  fill
                  className="rounded-md object-cover brightness-[0.65] select-none"
                />
              </CardContent>
            </Link>
            <CardFooter className="flex items-center justify-end pt-12">
              <div className="z-10 font-semibold tracking-tight text-white">
                {map.replayCode && <ReplayCode replayCode={map.replayCode} />}
              </div>
            </CardFooter>

            {/* Selection indicator badge */}
            {isSelected && (
              <Badge className="bg-primary text-primary-foreground pointer-events-none absolute top-3 right-3 z-20">
                {t("selected")}
              </Badge>
            )}
          </Card>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuLabel>{t("contextMenu.title")}</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuCheckboxItem
            checked={isSelected}
            onCheckedChange={handleToggleSelection}
          >
            {t("contextMenu.selectForComparison")}
          </ContextMenuCheckboxItem>
          <ContextMenuItem onSelect={handleAddToMapGroup}>
            {t("contextMenu.addToMapGroup")}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem asChild>
            <Link
              href={`/${teamId}/scrim/${scrimId}/map/${map.id}` as Route}
              className="cursor-pointer"
            >
              {t("contextMenu.viewDetails")}
            </Link>
          </ContextMenuItem>
          {map.replayCode && (
            <ContextMenuItem onSelect={handleCopyReplayCode}>
              {t("contextMenu.copyCode")}
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </>
  );
}

// Memoize to prevent unnecessary re-renders
export const MapCardWithSelection = memo(
  MapCardWithSelectionComponent,
  (prev, next) =>
    prev.map.id === next.map.id &&
    prev.scrimId === next.scrimId &&
    prev.teamId === next.teamId &&
    prev.locale === next.locale
);

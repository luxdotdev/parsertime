"use client";

import { AddToMapGroupDialog } from "@/components/scrim/add-to-map-group-dialog";
import { MapWinnerDialog } from "@/components/scrim/map-winner-dialog";
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
import type { Map } from "@/generated/prisma/browser";
import { useSelector } from "@xstate/store/react";
import { Pencil1Icon } from "@radix-ui/react-icons";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { memo, useCallback, useState } from "react";
import { toast } from "sonner";

type MapCardWithSelectionProps = {
  map: Map;
  scrimId: number;
  teamId: number | string;
  locale: string;
  mapComparisonEnabled: boolean;
  team1Name?: string | null;
  team2Name?: string | null;
  ourTeamName?: string | null;
  resolvedWinner?: string | null;
  canManage?: boolean;
};

type MapResultLabel = "won" | "lost" | "draw" | "unknown";

function deriveResultLabel(
  resolvedWinner: string | null | undefined,
  ourTeamName: string | null | undefined
): MapResultLabel {
  if (!resolvedWinner || resolvedWinner === "N/A") return "unknown";
  if (!ourTeamName) return "unknown";
  return resolvedWinner === ourTeamName ? "won" : "lost";
}

function MapCardWithSelectionComponent({
  map,
  scrimId,
  teamId,
  mapComparisonEnabled,
  team1Name,
  team2Name,
  ourTeamName,
  resolvedWinner,
  canManage = false,
}: MapCardWithSelectionProps) {
  const t = useTranslations("scrimPage.mapCard");
  const [isMapGroupDialogOpen, setIsMapGroupDialogOpen] = useState(false);
  const [isWinnerDialogOpen, setIsWinnerDialogOpen] = useState(false);

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

  const handleOpenWinnerDialog = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWinnerDialogOpen(true);
  }, []);

  const resultLabel = deriveResultLabel(resolvedWinner, ourTeamName);
  const resultText =
    resultLabel === "won"
      ? "Won"
      : resultLabel === "lost"
        ? "Lost"
        : resultLabel === "draw"
          ? "Draw"
          : "—";
  const canEditWinner = canManage && !!team1Name && !!team2Name;

  const card = (
    <Card
      className={cn(
        "relative aspect-video overflow-hidden",
        "ring-foreground/10 shadow-xs ring-1",
        "motion-safe:transition-[box-shadow,outline-color] motion-safe:duration-150",
        "[@media(hover:hover)_and_(pointer:fine)]:hover:ring-foreground/25 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-md",
        isSelected && "ring-primary shadow-lg ring-2"
      )}
      role="article"
      aria-label={
        isSelected
          ? t("ariaLabelSelected", { map: displayName })
          : t("ariaLabel", { map: displayName })
      }
    >
      <Link
        href={`/${teamId}/scrim/${scrimId}/map/${map.id}` as Route}
        prefetch={true}
        transitionTypes={["expand-map"]}
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
          <div
            className="pointer-events-none absolute inset-0 rounded-md bg-gradient-to-b from-black/65 via-transparent to-black/55"
            aria-hidden="true"
          />
        </CardContent>
      </Link>
      <CardFooter className="flex items-center justify-end pt-12">
        <div className="z-10 font-semibold tracking-tight text-white">
          {map.replayCode && <ReplayCode replayCode={map.replayCode} />}
        </div>
      </CardFooter>

      {isSelected && (
        <Badge className="bg-primary text-primary-foreground pointer-events-none absolute top-3 right-3 z-20">
          {t("selected")}
        </Badge>
      )}

      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold tracking-[0.08em] uppercase tabular-nums",
            resultLabel === "won" && "bg-emerald-500/85 text-white",
            resultLabel === "lost" && "bg-red-500/85 text-white",
            resultLabel === "draw" && "bg-zinc-500/85 text-white",
            resultLabel === "unknown" && "bg-black/55 text-white/80"
          )}
        >
          {resultText}
        </span>
        {map.winnerSource === "auto_coords" && (
          <span
            className="inline-flex items-center rounded-sm bg-black/55 px-1.5 py-0.5 font-mono text-[0.625rem] tracking-[0.08em] text-white/70 uppercase"
            title="Auto-detected from positions"
          >
            auto
          </span>
        )}
        {canEditWinner && (
          <button
            type="button"
            onClick={handleOpenWinnerDialog}
            aria-label={`Edit winner for ${displayName}`}
            className="inline-flex size-5 items-center justify-center rounded-sm bg-black/55 text-white/80 transition-colors hover:bg-black/75 hover:text-white"
          >
            <Pencil1Icon className="size-3" aria-hidden="true" />
          </button>
        )}
      </div>
    </Card>
  );

  return (
    <>
      {typeof teamId === "number" && (
        <AddToMapGroupDialog
          open={isMapGroupDialogOpen}
          onOpenChange={setIsMapGroupDialogOpen}
          teamId={teamId}
          mapIds={[map.id]}
          mapName={displayName}
        />
      )}
      {canEditWinner && (
        <MapWinnerDialog
          open={isWinnerDialogOpen}
          onOpenChange={setIsWinnerDialogOpen}
          mapId={map.id}
          mapName={displayName}
          team1Name={team1Name ?? ""}
          team2Name={team2Name ?? ""}
          currentWinner={map.winner}
        />
      )}
      {mapComparisonEnabled ? (
        <ContextMenu>
          <ContextMenuTrigger asChild>{card}</ContextMenuTrigger>
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
            {canEditWinner && (
              <ContextMenuItem onSelect={() => setIsWinnerDialogOpen(true)}>
                Set winner
              </ContextMenuItem>
            )}
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
      ) : (
        card
      )}
    </>
  );
}

// Memoize to prevent unnecessary re-renders
export const MapCardWithSelection = memo(
  MapCardWithSelectionComponent,
  (prev, next) =>
    prev.map.id === next.map.id &&
    prev.map.winner === next.map.winner &&
    prev.map.winnerSource === next.map.winnerSource &&
    prev.scrimId === next.scrimId &&
    prev.teamId === next.teamId &&
    prev.locale === next.locale &&
    prev.mapComparisonEnabled === next.mapComparisonEnabled &&
    prev.team1Name === next.team1Name &&
    prev.team2Name === next.team2Name &&
    prev.ourTeamName === next.ourTeamName &&
    prev.resolvedWinner === next.resolvedWinner &&
    prev.canManage === next.canManage
);

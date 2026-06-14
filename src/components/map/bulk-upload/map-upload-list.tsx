"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn, toKebabCase } from "@/lib/utils";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ReloadIcon } from "@radix-ui/react-icons";
import { AlertTriangle, Check, GripVertical, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { MapBansEditor } from "./map-bans-editor";
import type { BulkMapUpload } from "./use-bulk-map-upload";
import { isPushMap, type PendingMap } from "./types";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function monogram(name: string | undefined, fallback: string) {
  const source = (name ?? fallback).trim();
  const parts = source.split(/[\s:-]+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return letters.toUpperCase() || source.slice(0, 2).toUpperCase();
}

function MapTile({ map }: { map: PendingMap }) {
  const [imgError, setImgError] = useState(false);

  if (map.parseFailed) {
    return (
      <div
        className="bg-destructive/10 text-destructive flex size-9 shrink-0 items-center justify-center rounded-md"
        aria-hidden="true"
      >
        <AlertTriangle className="size-4" />
      </div>
    );
  }

  if (map.mapName && !imgError) {
    return (
      <div className="bg-muted relative size-9 shrink-0 overflow-hidden rounded-md">
        <Image
          src={`/maps/${toKebabCase(map.mapName)}.webp`}
          alt=""
          fill
          sizes="36px"
          className="object-cover select-none"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md font-mono text-[0.6875rem] font-medium tracking-[0.04em]"
      aria-hidden="true"
    >
      {monogram(map.mapName, map.fileName)}
    </div>
  );
}

function StatusPill({ map }: { map: PendingMap }) {
  const t = useTranslations("bulkUpload");
  switch (map.status) {
    case "uploading":
      return (
        <span className="text-primary flex items-center gap-1.5 font-mono text-[0.6875rem] tracking-[0.04em] uppercase">
          <ReloadIcon className="size-3 animate-spin" />
          {t("statusUploading")}
        </span>
      );
    case "done":
      return (
        <span className="text-muted-foreground flex items-center gap-1.5 font-mono text-[0.6875rem] tracking-[0.04em] uppercase">
          <Check className="size-3" />
          {t("statusDone")}
        </span>
      );
    case "failed":
      return (
        <span className="text-destructive flex items-center gap-1.5 font-mono text-[0.6875rem] tracking-[0.04em] uppercase">
          <AlertTriangle className="size-3" />
          {t("statusFailed")}
        </span>
      );
    default:
      return null;
  }
}

function MapWinnerControl({
  map,
  upload,
  disabled,
}: {
  map: PendingMap;
  upload: BulkMapUpload;
  disabled: boolean;
}) {
  const t = useTranslations("bulkUpload");
  const groupId = useId();
  const team1 = map.parsedData?.match_start?.[0]?.[4];
  const team2 = map.parsedData?.match_start?.[0]?.[5];
  if (!team1 || !team2) return null;

  const teams = [team1, team2];

  return (
    <div className="border-border/60 border-t px-3 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.04em] uppercase">
          {t("winnerLabel")}
        </span>
        <RadioGroup
          className="flex w-auto flex-wrap gap-4"
          value={map.winner ?? ""}
          disabled={disabled}
          onValueChange={(v) =>
            upload.patchMap(map.id, { winner: v, winnerSource: "manual" })
          }
        >
          {teams.map((team) => (
            <div key={team} className="flex items-center gap-2">
              <RadioGroupItem value={team} id={`${groupId}-${team}`} />
              <Label
                htmlFor={`${groupId}-${team}`}
                className="cursor-pointer text-sm font-normal"
              >
                {team}
              </Label>
            </div>
          ))}
        </RadioGroup>
        {map.winnerSource === "auto_coords" && map.winner && (
          <span className="text-muted-foreground/70 text-xs">
            {t("winnerSuggested")}
          </span>
        )}
      </div>
    </div>
  );
}

function SortableMapRow({
  map,
  index,
  upload,
  disabled,
}: {
  map: PendingMap;
  index: number;
  upload: BulkMapUpload;
  disabled: boolean;
}) {
  const t = useTranslations("bulkUpload");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: map.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const failedParse = map.parseFailed;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-border bg-card/40 rounded-lg border",
        map.status === "failed" && "border-destructive/50",
        map.status === "uploading" && "border-primary/50"
      )}
    >
      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          aria-label={t("reorderMap")}
          disabled={disabled}
          className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md transition-colors active:cursor-grabbing disabled:cursor-default disabled:opacity-40"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>

        <MapTile map={map} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="truncate">{map.mapName ?? map.fileName}</span>
          </div>
          <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            <span className="font-mono tabular-nums">
              {formatBytes(map.file.size)}
            </span>
            {failedParse ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-destructive">{t("parseError")}</span>
              </>
            ) : (
              map.team1 &&
              map.team2 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">
                    {map.team1}
                    <span className="text-muted-foreground/60 mx-1">
                      {t("versus")}
                    </span>
                    {map.team2}
                  </span>
                </>
              )
            )}
            {!failedParse && map.timestamp === null && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-muted-foreground/70">
                  {t("noTimestamp")}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <StatusPill map={map} />
          {map.status === "parsing" ? (
            <ReloadIcon className="text-muted-foreground size-3.5 animate-spin" />
          ) : (
            <span className="text-muted-foreground/70 w-6 text-right font-mono text-sm tabular-nums">
              {index + 1}
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label={t("removeMap")}
            className="text-muted-foreground hover:text-destructive"
            onClick={() => upload.removeMap(map.id)}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {map.status === "failed" && map.error && (
        <p className="text-destructive border-border/60 border-t px-3 py-2 text-xs">
          {map.error}
        </p>
      )}

      {!failedParse && map.status !== "parsing" && isPushMap(map.mapName) && (
        <MapWinnerControl map={map} upload={upload} disabled={disabled} />
      )}

      {!failedParse && (
        <div className="border-border/60 border-t px-3 py-3">
          <MapBansEditor
            bans={map.heroBans}
            onChange={(bans) => upload.setHeroBans(map.id, bans)}
            team1Name={map.team1}
            team2Name={map.team2}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

type Props = {
  upload: BulkMapUpload;
  /** Disable all editing while a sequential upload is in flight. */
  busy?: boolean;
};

export function MapUploadList({ upload, busy = false }: Props) {
  const t = useTranslations("bulkUpload");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const { pendingMaps, addFiles, reorder, atCapacity } = upload;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleInput(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    void addFiles(files);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length > 0) void addFiles(files);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorder(String(active.id), String(over.id));
    }
  }

  const dropDisabled = busy || atCapacity;

  // Weight progress by row count so a large map moves the bar more than a
  // short one, and add the uploading map's streamed fraction so the bar
  // crawls within a single map instead of jumping per map.
  const usable = pendingMaps.filter((m) => !m.parseFailed);
  const totalRows = usable.reduce((sum, m) => sum + m.rowCount, 0) || 1;
  const doneRows = usable
    .filter((m) => m.status === "done")
    .reduce((sum, m) => sum + m.rowCount, 0);
  const inflightRows = usable
    .filter((m) => m.status === "uploading")
    .reduce((sum, m) => sum + m.rowCount * m.progress, 0);
  const progressPct = Math.round(((doneRows + inflightRows) / totalRows) * 100);
  const doneMaps = usable.filter((m) => m.status === "done").length;
  const currentMap = Math.min(doneMaps + 1, usable.length);
  const progressLabel = t("progress", {
    current: currentMap,
    total: usable.length,
  });

  return (
    <div className="space-y-3">
      {busy && usable.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.04em] uppercase">
              {progressLabel}
            </span>
            <span className="text-muted-foreground font-mono text-[0.6875rem] tabular-nums">
              {progressPct}%
            </span>
          </div>
          <Progress value={progressPct} aria-label={progressLabel} />
        </div>
      )}

      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          if (!dropDisabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          if (!dropDisabled) handleDrop(e);
          else e.preventDefault();
        }}
        className={cn(
          "border-border bg-card/30 hover:bg-card/60 group relative flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-7 text-center transition-colors",
          dragActive && "border-primary/60 bg-primary/5",
          dropDisabled && "pointer-events-none opacity-50"
        )}
      >
        <div className="bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary flex size-10 items-center justify-center rounded-md transition-colors">
          <Upload className="size-5" />
        </div>
        <p className="text-foreground mt-3 text-sm font-medium">
          {pendingMaps.length === 0 ? t("dropTitleEmpty") : t("dropTitleMore")}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          {t("dropSubtitle")}
        </p>
        <p className="text-muted-foreground/70 mt-3 font-mono text-[0.6875rem] tracking-[0.04em] uppercase">
          {t("dropHint", { max: upload.maxMaps })}
        </p>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".txt"
          multiple
          className="sr-only"
          onChange={handleInput}
          disabled={dropDisabled}
        />
      </label>

      {pendingMaps.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={pendingMaps.map((m) => m.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {pendingMaps.map((map, index) => (
                <SortableMapRow
                  key={map.id}
                  map={map}
                  index={index}
                  upload={upload}
                  disabled={busy}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

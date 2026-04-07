"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useColorblindMode } from "@/hooks/use-colorblind-mode";
import type { Tool } from "@/lib/coaching/types";
import { coachingCanvasStore } from "@/stores/coaching-canvas-store";
import { useSelector } from "@xstate/store/react";
import {
  ArrowUpRightIcon,
  EraserIcon,
  MousePointerIcon,
  PenToolIcon,
  Redo2Icon,
  RotateCcwIcon,
  Undo2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";

const NEUTRAL_COLORS: { value: string; label: string }[] = [
  { value: "#ffffff", label: "White" },
  { value: "#000000", label: "Black" },
  { value: "#facc15", label: "Yellow" },
];

export function CanvasToolbar() {
  const t = useTranslations("coaching.toolbar");
  const tReset = useTranslations("coaching.reset");
  const { team1, team2 } = useColorblindMode();

  const activeTool = useSelector(
    coachingCanvasStore,
    (s) => s.context.activeTool
  );
  const strokeColor = useSelector(
    coachingCanvasStore,
    (s) => s.context.strokeColor
  );
  const strokeWidth = useSelector(
    coachingCanvasStore,
    (s) => s.context.strokeWidth
  );
  const canUndo = useSelector(
    coachingCanvasStore,
    (s) => s.context.undoStack.length > 0
  );
  const canRedo = useSelector(
    coachingCanvasStore,
    (s) => s.context.redoStack.length > 0
  );

  const colorPresets = [
    { value: team1, label: t("team1Color") },
    { value: team2, label: t("team2Color") },
    ...NEUTRAL_COLORS,
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleGroup
        type="single"
        value={activeTool}
        onValueChange={(value) => {
          if (value)
            coachingCanvasStore.send({ type: "setTool", tool: value as Tool });
        }}
        variant="outline"
        size="sm"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="select" aria-label={t("select")}>
              <MousePointerIcon className="size-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>{t("select")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="pen" aria-label={t("pen")}>
              <PenToolIcon className="size-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>{t("pen")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="arrow" aria-label={t("arrow")}>
              <ArrowUpRightIcon className="size-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>{t("arrow")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="eraser" aria-label={t("eraser")}>
              <EraserIcon className="size-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>{t("eraser")}</TooltipContent>
        </Tooltip>
      </ToggleGroup>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center gap-1">
        {colorPresets.map(({ value, label }) => (
          <Tooltip key={value}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() =>
                  coachingCanvasStore.send({
                    type: "setStrokeColor",
                    color: value,
                  })
                }
                className="size-5 rounded-full border transition-transform hover:scale-110"
                style={{
                  backgroundColor: value,
                  boxShadow:
                    strokeColor === value
                      ? "0 0 0 2px var(--color-ring)"
                      : undefined,
                }}
                aria-label={label}
              />
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {t("strokeWidth")}
        </span>
        <Slider
          className="w-20"
          min={1}
          max={10}
          step={1}
          value={[strokeWidth]}
          onValueChange={([v]) =>
            coachingCanvasStore.send({ type: "setStrokeWidth", width: v })
          }
          aria-label={t("strokeWidth")}
        />
        <span className="text-muted-foreground w-4 text-center text-xs tabular-nums">
          {strokeWidth}
        </span>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={!canUndo}
            onClick={() => coachingCanvasStore.send({ type: "undo" })}
          >
            <Undo2Icon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("undo")}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={!canRedo}
            onClick={() => coachingCanvasStore.send({ type: "redo" })}
          >
            <Redo2Icon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("redo")}</TooltipContent>
      </Tooltip>

      <AlertDialog>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <RotateCcwIcon className="size-4" />
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>{t("reset")}</TooltipContent>
        </Tooltip>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tReset("title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tReset("description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tReset("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => coachingCanvasStore.send({ type: "reset" })}
            >
              {tReset("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

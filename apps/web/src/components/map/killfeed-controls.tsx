"use client";

import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { KillfeedDisplayOptions } from "@/data/map/killfeed/types";
import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

type KillfeedControlsProps = {
  options: KillfeedDisplayOptions;
  onOptionsChange: (options: KillfeedDisplayOptions) => void;
};

export function KillfeedControls({
  options,
  onOptionsChange,
}: KillfeedControlsProps) {
  const t = useTranslations("mapPage.killfeedControls");

  function handleToggle(key: keyof KillfeedDisplayOptions) {
    onOptionsChange({ ...options, [key]: !options[key] });
  }

  const ultOptionsDisabled = !options.showTimeline;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground inline-flex items-center justify-center rounded-md p-1.5 transition-colors"
          aria-label={t("ariaLabel")}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <PopoverHeader>
          <PopoverTitle>{t("title")}</PopoverTitle>
        </PopoverHeader>
        <div className="flex flex-col gap-3">
          <fieldset>
            <legend className="text-muted-foreground mb-2 font-mono text-xs tracking-[0.06em] uppercase">
              {t("viewMode")}
            </legend>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col">
                  <Label
                    htmlFor="timeline-view"
                    className="text-xs font-normal"
                  >
                    {t("timelineView")}
                  </Label>
                  <span className="text-muted-foreground text-xs leading-tight">
                    {t("timelineViewDescription")}
                  </span>
                </div>
                <Switch
                  id="timeline-view"
                  checked={options.showTimeline}
                  onCheckedChange={() => handleToggle("showTimeline")}
                />
              </div>
            </div>
          </fieldset>

          <Separator />

          <fieldset disabled={ultOptionsDisabled} className="group">
            <legend className="text-muted-foreground mb-2 font-mono text-xs tracking-[0.06em] uppercase group-disabled:opacity-50">
              {t("ultSection")}
            </legend>
            <div className="flex flex-col gap-2 group-disabled:opacity-50">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="ult-brackets" className="text-xs font-normal">
                  {t("ultBrackets")}
                </Label>
                <Switch
                  id="ult-brackets"
                  checked={options.showUltBrackets}
                  onCheckedChange={() => handleToggle("showUltBrackets")}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="ult-labels" className="text-xs font-normal">
                  {t("ultLabels")}
                </Label>
                <Switch
                  id="ult-labels"
                  checked={options.showUltLabels}
                  onCheckedChange={() => handleToggle("showUltLabels")}
                  disabled={!options.showUltBrackets}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor="ult-start-events"
                  className="text-xs font-normal"
                >
                  {t("ultStartEvents")}
                </Label>
                <Switch
                  id="ult-start-events"
                  checked={options.showUltStartEvents}
                  onCheckedChange={() => handleToggle("showUltStartEvents")}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="ult-end-events" className="text-xs font-normal">
                  {t("ultEndEvents")}
                </Label>
                <Switch
                  id="ult-end-events"
                  checked={options.showUltEndEvents}
                  onCheckedChange={() => handleToggle("showUltEndEvents")}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor="ult-kill-highlights"
                  className="text-xs font-normal"
                >
                  {t("ultKillHighlights")}
                </Label>
                <Switch
                  id="ult-kill-highlights"
                  checked={options.showUltKillHighlights}
                  onCheckedChange={() => handleToggle("showUltKillHighlights")}
                />
              </div>
            </div>
          </fieldset>
        </div>
      </PopoverContent>
    </Popover>
  );
}

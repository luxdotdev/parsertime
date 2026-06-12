"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ActivityHeatmapResult } from "@/lib/ranked-stats";
import { useTranslations } from "next-intl";

type ActivityHeatmapProps = {
  result: ActivityHeatmapResult;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDateLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getMonthLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  if (d.getDate() <= 7) {
    return d.toLocaleDateString(undefined, { month: "short" });
  }
  return "";
}

function cellOpacity(count: number, maxCount: number): number {
  if (count === 0 || maxCount === 0) return 0;
  return Math.max(0.15, count / maxCount);
}

export function ActivityHeatmap({ result }: ActivityHeatmapProps) {
  const t = useTranslations("ranked.charts.activityHeatmap");
  const { data, maxCount, insight } = result;

  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  const monthHeaders = weeks.map((week) => getMonthLabel(week[0]?.date ?? ""));

  const hasData = data.some((d) => d.count > 0);

  const description = hasData
    ? t("description", {
        day: insight.peakDayOfWeek,
        avg: insight.avgGamesPerActiveDay,
      })
    : t("emptyDescription");

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={description}
      />
      <TooltipProvider delayDuration={0}>
        <div className="w-full overflow-x-auto">
          <div className="inline-flex flex-col gap-1">
            <div className="mb-1 flex gap-1 pl-9">
              {weeks.map((week, wi) => (
                <div
                  key={week[0]?.date}
                  className="text-muted-foreground w-3.5 text-center text-[9px] leading-none"
                >
                  {monthHeaders[wi]}
                </div>
              ))}
            </div>

            <div role="grid" aria-label={t("gridLabel")}>
              {Array.from({ length: 7 }, (_, dayIndex) => (
                <div
                  key={DAY_LABELS[dayIndex]}
                  role="row"
                  className="mb-1 flex items-center gap-1"
                >
                  <span
                    className="text-muted-foreground w-8 shrink-0 text-right text-[10px] leading-none"
                    aria-hidden="true"
                  >
                    {dayIndex % 2 === 1 ? DAY_LABELS[dayIndex] : ""}
                  </span>
                  {weeks.map((week) => {
                    const cell = week[dayIndex];
                    if (!cell) {
                      return (
                        <div
                          key={`${week[0]?.date}-${DAY_LABELS[dayIndex]}`}
                          role="gridcell"
                          className="size-3.5 shrink-0 rounded-sm"
                        />
                      );
                    }
                    const opacity = cellOpacity(cell.count, maxCount);
                    const label =
                      cell.count === 0
                        ? t("cellNoGames", { date: formatDateLabel(cell.date) })
                        : t("cellGames", {
                            date: formatDateLabel(cell.date),
                            count: cell.count,
                          });
                    return (
                      <Tooltip key={cell.date}>
                        <TooltipTrigger asChild>
                          <div
                            role="gridcell"
                            aria-label={label}
                            className="size-3.5 shrink-0 cursor-default rounded-sm transition-opacity"
                            style={{
                              backgroundColor:
                                cell.count === 0
                                  ? "var(--muted)"
                                  : `color-mix(in oklch, var(--primary) ${Math.round(opacity * 100)}%, var(--muted) ${Math.round((1 - opacity) * 100)}%)`,
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">{label}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="mt-1 flex items-center gap-2 pl-9">
              <span className="text-muted-foreground text-[10px]">
                {t("less")}
              </span>
              {[0, 0.2, 0.4, 0.7, 1].map((level) => (
                <div
                  key={level}
                  className="size-3.5 shrink-0 rounded-sm"
                  aria-hidden="true"
                  style={{
                    backgroundColor:
                      level === 0
                        ? "var(--muted)"
                        : `color-mix(in oklch, var(--primary) ${Math.round(level * 100)}%, var(--muted) ${Math.round((1 - level) * 100)}%)`,
                  }}
                />
              ))}
              <span className="text-muted-foreground text-[10px]">
                {t("more")}
              </span>
            </div>
          </div>
        </div>
      </TooltipProvider>
      <p className="text-muted-foreground text-xs">
        {t("footer", {
          days: insight.totalActiveDays,
          weeks: Math.round(data.length / 7),
        })}
      </p>
    </section>
  );
}

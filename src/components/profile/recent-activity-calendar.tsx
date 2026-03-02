"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Scrim } from "@prisma/client";
import { useMemo, useState } from "react";

type RecentActivityCalendarProps = {
  scrims: Scrim[];
  dateRange?: { from: Date; to: Date };
};

type DayActivity = {
  date: Date;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
};

const BAR_CHART_THRESHOLD_DAYS = 90;

function generateDayData(
  scrims: Scrim[],
  startDate: Date,
  endDate: Date
): DayActivity[] {
  const activityMap = new Map<string, number>();

  for (const scrim of scrims) {
    const scrimDate = new Date(scrim.date);
    if (scrimDate >= startDate && scrimDate <= endDate) {
      const dateKey = scrimDate.toISOString().split("T")[0];
      activityMap.set(dateKey, (activityMap.get(dateKey) ?? 0) + 1);
    }
  }

  const maxActivity = Math.max(...Array.from(activityMap.values()), 1);
  const days: DayActivity[] = [];
  const daysDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  for (let i = 0; i <= daysDiff; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateKey = date.toISOString().split("T")[0];
    const count = activityMap.get(dateKey) ?? 0;

    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count > 0) {
      const percentage = count / maxActivity;
      if (percentage >= 0.75) level = 4;
      else if (percentage >= 0.5) level = 3;
      else if (percentage >= 0.25) level = 2;
      else level = 1;
    }

    days.push({ date, count, level });
  }

  return days;
}

function generateCalendarData(
  scrims: Scrim[],
  selectedYear: number
): DayActivity[] {
  const today = new Date();
  const currentYear = today.getFullYear();
  const isCurrentYear = selectedYear === currentYear;

  let startDate: Date;
  let endDate: Date;

  if (isCurrentYear) {
    const daysToShow = 52 * 7;
    startDate = new Date(today);
    startDate.setDate(today.getDate() - daysToShow);
    endDate = today;
  } else {
    startDate = new Date(selectedYear, 0, 1);
    endDate = new Date(selectedYear, 11, 31);
  }

  const activityMap = new Map<string, number>();

  for (const scrim of scrims) {
    const scrimDate = new Date(scrim.date);
    if (scrimDate.getFullYear() === selectedYear) {
      const dateKey = scrimDate.toISOString().split("T")[0];
      activityMap.set(dateKey, (activityMap.get(dateKey) ?? 0) + 1);
    }
  }

  const maxActivity = Math.max(...Array.from(activityMap.values()), 1);
  const calendarData: DayActivity[] = [];
  const daysDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  for (let i = 0; i <= daysDiff; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateKey = date.toISOString().split("T")[0];
    const count = activityMap.get(dateKey) ?? 0;

    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count > 0) {
      const percentage = count / maxActivity;
      if (percentage >= 0.75) level = 4;
      else if (percentage >= 0.5) level = 3;
      else if (percentage >= 0.25) level = 2;
      else level = 1;
    }

    calendarData.push({ date, count, level });
  }

  return calendarData;
}

function calculateStreak(
  scrims: Scrim[],
  selectedYear: number,
  dateRange?: { from: Date; to: Date }
): {
  currentStreak: number;
  longestStreak: number;
} {
  const currentYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentYear;

  const filteredScrims = dateRange
    ? scrims.filter((s) => {
        const d = new Date(s.date);
        return d >= dateRange.from && d <= dateRange.to;
      })
    : scrims.filter((s) => new Date(s.date).getFullYear() === selectedYear);

  if (filteredScrims.length === 0)
    return { currentStreak: 0, longestStreak: 0 };

  const sortedDates = filteredScrims
    .map((s) => new Date(s.date).toISOString().split("T")[0])
    .sort()
    .filter((date, index, self) => self.indexOf(date) === index);

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  if (isCurrentYear && !dateRange) {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const lastPlayDate = sortedDates[sortedDates.length - 1];
    if (lastPlayDate === today || lastPlayDate === yesterdayStr) {
      currentStreak = 1;

      for (let i = sortedDates.length - 2; i >= 0; i--) {
        const current = new Date(sortedDates[i]);
        const next = new Date(sortedDates[i + 1]);
        const diffDays = Math.floor(
          (next.getTime() - current.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  }

  for (let i = 1; i < sortedDates.length; i++) {
    const current = new Date(sortedDates[i]);
    const previous = new Date(sortedDates[i - 1]);
    const diffDays = Math.floor(
      (current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return { currentStreak, longestStreak };
}

function formatBarLabel(date: Date, totalDays: number): string {
  if (totalDays <= 14) {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "numeric",
      day: "numeric",
    });
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getBarLabelInterval(totalDays: number): number {
  if (totalDays <= 14) return 1;
  if (totalDays <= 31) return 7;
  return 14;
}

function ActivityBarChart({ data }: { data: DayActivity[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const barHeight = 120;
  const labelInterval = getBarLabelInterval(data.length);

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-[2px]" style={{ height: barHeight }}>
        {data.map((day) => {
          const heightPercent =
            day.count > 0 ? Math.max((day.count / maxCount) * 100, 8) : 0;

          return (
            <TooltipProvider key={day.date.toISOString()} delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="flex flex-1 items-end"
                    style={{ height: "100%" }}
                  >
                    <div
                      className={cn(
                        "w-full rounded-t-sm transition-colors",
                        day.count === 0
                          ? "bg-muted"
                          : "bg-green-500 hover:bg-green-400 dark:bg-green-600 dark:hover:bg-green-500"
                      )}
                      style={{
                        height: day.count > 0 ? `${heightPercent}%` : "4px",
                      }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p className="font-semibold">
                      {day.date.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p>
                      {day.count === 0
                        ? "No activity"
                        : `${day.count} scrim${day.count > 1 ? "s" : ""}`}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>

      <div className="flex gap-[2px]">
        {data.map((day, i) => (
          <div key={day.date.toISOString()} className="flex-1 text-center">
            {i % labelInterval === 0 && (
              <span className="text-muted-foreground text-[10px] leading-none">
                {formatBarLabel(day.date, data.length)}
              </span>
            )}
          </div>
        ))}
      </div>

      {maxCount > 0 && (
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>0 scrims</span>
          <span>
            {maxCount} scrim{maxCount !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}

function DayCell({ day }: { day: DayActivity }) {
  const levelColors = {
    0: "bg-muted",
    1: "bg-green-200 dark:bg-green-900",
    2: "bg-green-300 dark:bg-green-700",
    3: "bg-green-400 dark:bg-green-600",
    4: "bg-green-500 dark:bg-green-500",
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`h-3 w-3 rounded-sm transition-colors hover:ring-2 hover:ring-green-400 ${levelColors[day.level]}`}
          />
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p className="font-semibold">
              {day.date.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p>
              {day.count === 0
                ? "No activity"
                : `${day.count} scrim${day.count > 1 ? "s" : ""}`}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function CalendarHeatmap({
  calendarData,
  years,
  selectedYear,
  onYearChange,
  showYearPicker = true,
}: {
  calendarData: DayActivity[];
  years: number[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  showYearPicker?: boolean;
}) {
  const weeks: DayActivity[][] = [];
  for (let i = 0; i < calendarData.length; i += 7) {
    weeks.push(calendarData.slice(i, i + 7));
  }

  const monthLabels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;

  weeks.forEach((week, weekIndex) => {
    const month = week[0].date.getMonth();
    if (month !== lastMonth && weekIndex % 4 === 0) {
      monthLabels.push({
        label: week[0].date.toLocaleDateString("en-US", { month: "short" }),
        weekIndex,
      });
      lastMonth = month;
    }
  });

  const daysActive = calendarData.filter((day) => day.count > 0).length;

  return (
    <div className="flex items-start gap-4">
      {showYearPicker && (
        <div className="flex shrink-0 flex-col gap-1">
          {years.map((year) => (
            <button
              key={year}
              type="button"
              className={cn(
                "h-7 min-w-[3rem] rounded-md px-2 text-xs font-normal transition-colors",
                "flex items-center justify-center",
                selectedYear === year
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              onClick={() => onYearChange(year)}
            >
              {year}
            </button>
          ))}
        </div>
      )}

      <div className="min-w-0 flex-1 overflow-x-auto">
        <div className="relative min-w-max">
          <div
            className="mb-2 flex gap-1 text-xs"
            style={{ paddingLeft: "20px" }}
          >
            {monthLabels.map((month) => (
              <div
                key={month.label}
                className="text-muted-foreground"
                style={{
                  position: "absolute",
                  left: `${month.weekIndex * 16 + 20}px`,
                }}
              >
                {month.label}
              </div>
            ))}
          </div>

          <div className="flex gap-1" style={{ marginTop: "20px" }}>
            <div className="text-muted-foreground flex flex-col gap-1 pr-2 text-xs">
              <div className="h-3" />
              <div>Mon</div>
              <div className="h-3" />
              <div>Wed</div>
              <div className="h-3" />
              <div>Fri</div>
              <div className="h-3" />
            </div>

            {weeks.map((week) => (
              <div
                key={week.map((day) => day.date.toISOString()).join(",")}
                className="flex flex-col gap-1"
              >
                {week.map((day) => (
                  <DayCell key={day.date.toISOString()} day={day} />
                ))}
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 text-xs">
            <span className="text-muted-foreground">Less</span>
            <div className="bg-muted h-3 w-3 rounded-sm" />
            <div className="h-3 w-3 rounded-sm bg-green-200 dark:bg-green-900" />
            <div className="h-3 w-3 rounded-sm bg-green-300 dark:bg-green-700" />
            <div className="h-3 w-3 rounded-sm bg-green-400 dark:bg-green-600" />
            <div className="h-3 w-3 rounded-sm bg-green-500 dark:bg-green-500" />
            <span className="text-muted-foreground">More</span>
          </div>

          {daysActive > 0 && (
            <div className="text-muted-foreground mt-4 text-center text-sm">
              Active on {daysActive} day{daysActive !== 1 ? "s" : ""} across{" "}
              {Math.ceil(calendarData.length / 7)} week
              {Math.ceil(calendarData.length / 7) !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function RecentActivityCalendar({
  scrims,
  dateRange,
}: RecentActivityCalendarProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const rangeDays = dateRange
    ? Math.ceil(
        (new Date(dateRange.to).getTime() -
          new Date(dateRange.from).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const useBarChart =
    rangeDays !== null && rangeDays < BAR_CHART_THRESHOLD_DAYS;

  const years = useMemo(() => {
    const yearList = [];
    for (let year = 2023; year <= currentYear; year++) {
      yearList.push(year);
    }
    return yearList.reverse();
  }, [currentYear]);

  const barData = useMemo(() => {
    if (!useBarChart || !dateRange) return [];
    return generateDayData(
      scrims,
      new Date(dateRange.from),
      new Date(dateRange.to)
    );
  }, [scrims, dateRange, useBarChart]);

  const calendarData = useMemo(() => {
    if (useBarChart) return [];
    if (dateRange) {
      return generateDayData(
        scrims,
        new Date(dateRange.from),
        new Date(dateRange.to)
      );
    }
    return generateCalendarData(scrims, selectedYear);
  }, [scrims, selectedYear, dateRange, useBarChart]);

  const { longestStreak } = useMemo(
    () => calculateStreak(scrims, selectedYear, dateRange),
    [scrims, selectedYear, dateRange]
  );

  const displayData = useBarChart ? barData : calendarData;
  const filteredScrims = dateRange
    ? scrims.filter((s) => {
        const d = new Date(s.date);
        return d >= new Date(dateRange.from) && d <= new Date(dateRange.to);
      })
    : scrims.filter((s) => new Date(s.date).getFullYear() === selectedYear);
  const totalScrims = filteredScrims.length;
  const daysActive = displayData.filter((day) => day.count > 0).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{totalScrims}</p>
              <p className="text-muted-foreground text-xs">Total Scrims</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{daysActive}</p>
              <p className="text-muted-foreground text-xs">Days Active</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{longestStreak}</p>
              <p className="text-muted-foreground text-xs">Longest Streak</p>
            </div>
          </div>

          {useBarChart ? (
            <ActivityBarChart data={barData} />
          ) : (
            <CalendarHeatmap
              calendarData={calendarData}
              years={years}
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
              showYearPicker={!dateRange}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

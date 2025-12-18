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
};

type DayActivity = {
  date: Date;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
};

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
    const weeksToShow = 52;
    const daysToShow = weeksToShow * 7;
    startDate = new Date(today);
    startDate.setDate(today.getDate() - daysToShow);
    endDate = today;
  } else {
    startDate = new Date(selectedYear, 0, 1);
    endDate = new Date(selectedYear, 11, 31);
  }

  const activityMap = new Map<string, number>();

  scrims.forEach((scrim) => {
    const scrimDate = new Date(scrim.date);
    if (scrimDate.getFullYear() === selectedYear) {
      const dateKey = scrimDate.toISOString().split("T")[0];
      activityMap.set(dateKey, (activityMap.get(dateKey) ?? 0) + 1);
    }
  });

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

    calendarData.push({
      date,
      count,
      level,
    });
  }

  return calendarData;
}

function calculateStreak(
  scrims: Scrim[],
  selectedYear: number
): {
  currentStreak: number;
  longestStreak: number;
} {
  const currentYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentYear;

  const yearScrims = scrims.filter(
    (s) => new Date(s.date).getFullYear() === selectedYear
  );

  if (yearScrims.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const sortedDates = yearScrims
    .map((s) => new Date(s.date).toISOString().split("T")[0])
    .sort()
    .filter((date, index, self) => self.indexOf(date) === index);

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  if (isCurrentYear) {
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

export function RecentActivityCalendar({
  scrims,
}: RecentActivityCalendarProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const years = useMemo(() => {
    const yearList = [];
    for (let year = 2023; year <= currentYear; year++) {
      yearList.push(year);
    }
    return yearList.reverse();
  }, [currentYear]);

  const calendarData = useMemo(
    () => generateCalendarData(scrims, selectedYear),
    [scrims, selectedYear]
  );
  const { currentStreak, longestStreak } = useMemo(
    () => calculateStreak(scrims, selectedYear),
    [scrims, selectedYear]
  );

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

  const yearScrims = scrims.filter(
    (s) => new Date(s.date).getFullYear() === selectedYear
  );
  const totalScrims = yearScrims.length;
  const daysActive = calendarData.filter((day) => day.count > 0).length;

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
              <p className="text-2xl font-bold">{currentStreak}</p>
              <p className="text-muted-foreground text-xs">Current Streak</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{longestStreak}</p>
              <p className="text-muted-foreground text-xs">Longest Streak</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
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
                  onClick={() => setSelectedYear(year)}
                >
                  {year}
                </button>
              ))}
            </div>

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
                    Active on {daysActive} days in the last{" "}
                    {Math.ceil(calendarData.length / 7)} weeks
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

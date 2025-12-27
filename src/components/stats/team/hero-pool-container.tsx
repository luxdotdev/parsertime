"use client";

import { HeroPoolOverviewCard } from "@/components/stats/team/hero-pool-overview-card";
import { HeroSpecialistsCard } from "@/components/stats/team/hero-specialists-card";
import { HeroWinratesCard } from "@/components/stats/team/hero-winrates-card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  HeroPoolAnalysis,
  HeroPoolRawData,
} from "@/data/team-hero-pool-dto";
import { calculateHeroPoolAnalysis } from "@/lib/hero-pool-utils";
import { cn } from "@/lib/utils";
import { addMonths, addWeeks, addYears, format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";

type Timeframe =
  | "one-week"
  | "two-weeks"
  | "one-month"
  | "three-months"
  | "six-months"
  | "one-year"
  | "all-time"
  | "custom";

type HeroPoolContainerProps = {
  rawData: HeroPoolRawData;
  initialData: HeroPoolAnalysis;
};

export function HeroPoolContainer({
  rawData,
  initialData,
}: HeroPoolContainerProps) {
  const TODAY = new Date();

  const [timeframe, setTimeframe] = useState<Timeframe>("all-time");
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [heroPoolData, setHeroPoolData] =
    useState<HeroPoolAnalysis>(initialData);

  function onTimeframeChange(val: Timeframe) {
    setTimeframe(val);

    if (val === "one-week") setDate({ from: addWeeks(TODAY, -1), to: TODAY });
    if (val === "two-weeks") setDate({ from: addWeeks(TODAY, -2), to: TODAY });
    if (val === "one-month") setDate({ from: addMonths(TODAY, -1), to: TODAY });
    if (val === "three-months")
      setDate({ from: addMonths(TODAY, -3), to: TODAY });
    if (val === "six-months")
      setDate({ from: addMonths(TODAY, -6), to: TODAY });
    if (val === "one-year") setDate({ from: addYears(TODAY, -1), to: TODAY });
    if (val === "all-time") setDate(undefined);
  }

  useEffect(() => {
    if (timeframe === "all-time" || !date?.from || !date?.to) {
      const calculatedData = calculateHeroPoolAnalysis(rawData);
      setHeroPoolData(calculatedData);
      return;
    }

    const calculatedData = calculateHeroPoolAnalysis(
      rawData,
      date.from,
      date.to
    );
    setHeroPoolData(calculatedData);
  }, [rawData, date, timeframe]);

  return (
    <div className="space-y-4">
      {/* Date Range Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={timeframe} onValueChange={onTimeframeChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="one-week">Last Week</SelectItem>
            <SelectItem value="two-weeks">Last 2 Weeks</SelectItem>
            <SelectItem value="one-month">Last Month</SelectItem>
            <SelectItem value="three-months">Last 3 Months</SelectItem>
            <SelectItem value="six-months">Last 6 Months</SelectItem>
            <SelectItem value="one-year">Last Year</SelectItem>
            <SelectItem value="all-time">All Time</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {timeframe === "custom" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant="outline"
                className={cn(
                  "w-[300px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Hero Pool Content */}
      <HeroPoolOverviewCard heroPool={heroPoolData} />
      <div className="grid gap-4 md:grid-cols-2">
        <HeroWinratesCard heroPool={heroPoolData} />
        <HeroSpecialistsCard heroPool={heroPoolData} />
      </div>
    </div>
  );
}

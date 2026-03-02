"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Link } from "@/components/ui/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Timeframe } from "@/lib/timeframe";
import { cn } from "@/lib/utils";
import { addMonths, addWeeks, addYears, format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import type { DateRange } from "react-day-picker";

export function TeamRangePicker({
  permissions,
  defaultTimeframe = "one-week",
}: {
  permissions: { [key: string]: boolean };
  defaultTimeframe?: Timeframe;
}) {
  const t = useTranslations("teamStatsPage.rangePicker");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const TODAY = new Date();

  const [date, setDate] = useState<DateRange | undefined>(() => {
    if (defaultTimeframe === "custom") {
      const fromParam = searchParams.get("from");
      const toParam = searchParams.get("to");
      if (fromParam && toParam) {
        return { from: new Date(fromParam), to: new Date(toParam) };
      }
    }
    return undefined;
  });

  const navigateWithParams = useCallback(
    (timeframe: Timeframe, customFrom?: Date, customTo?: Date) => {
      const params = new URLSearchParams(searchParams.toString());

      if (timeframe === "one-week") {
        params.delete("timeframe");
      } else {
        params.set("timeframe", timeframe);
      }

      if (timeframe === "custom" && customFrom && customTo) {
        params.set("from", customFrom.toISOString());
        params.set("to", customTo.toISOString());
      } else {
        params.delete("from");
        params.delete("to");
      }

      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}` as Route);
    },
    [router, pathname, searchParams]
  );

  function onTimeframeChange(val: Timeframe) {
    if (val === "one-week") setDate({ from: addWeeks(TODAY, -1), to: TODAY });
    if (val === "two-weeks") setDate({ from: addWeeks(TODAY, -2), to: TODAY });
    if (val === "one-month") setDate({ from: addMonths(TODAY, -1), to: TODAY });
    if (val === "three-months")
      setDate({ from: addMonths(TODAY, -3), to: TODAY });
    if (val === "six-months")
      setDate({ from: addMonths(TODAY, -6), to: TODAY });
    if (val === "one-year") setDate({ from: addYears(TODAY, -1), to: TODAY });
    if (val === "all-time") setDate(undefined);

    if (val !== "custom") {
      navigateWithParams(val);
    }
  }

  function onCustomDateChange(range: DateRange | undefined) {
    setDate(range);
    if (range?.from && range?.to) {
      navigateWithParams("custom", range.from, range.to);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select onValueChange={onTimeframeChange} defaultValue={defaultTimeframe}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={t("selectTimeframe")} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>{t("selectTimeframe")}</SelectLabel>
            <SelectItem
              value="one-week"
              disabled={!permissions["stats-timeframe-1"]}
            >
              {t("lastWeek")}
            </SelectItem>
            <SelectItem
              value="two-weeks"
              disabled={!permissions["stats-timeframe-1"]}
            >
              {t("last2Weeks")}
            </SelectItem>
            <SelectItem
              value="one-month"
              disabled={!permissions["stats-timeframe-1"]}
            >
              {t("lastMonth")}
            </SelectItem>
            <SelectItem
              value="three-months"
              disabled={!permissions["stats-timeframe-2"]}
            >
              {t("last3Months")}
            </SelectItem>
            <SelectItem
              value="six-months"
              disabled={!permissions["stats-timeframe-2"]}
            >
              {t("last6Months")}
            </SelectItem>
            <SelectItem
              value="one-year"
              disabled={!permissions["stats-timeframe-3"]}
            >
              {t("lastYear")}
            </SelectItem>
            <SelectItem
              value="all-time"
              disabled={!permissions["stats-timeframe-3"]}
            >
              {t("allTime")}
            </SelectItem>
            <SelectItem
              value="custom"
              disabled={!permissions["stats-timeframe-3"]}
            >
              {t("customRange")}
            </SelectItem>
          </SelectGroup>
          {!permissions["stats-timeframe-3"] && (
            <>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>
                  <Link href="/pricing" external>
                    {t("upgrade")}
                  </Link>
                </SelectLabel>
              </SelectGroup>
            </>
          )}
        </SelectContent>
      </Select>

      {defaultTimeframe === "custom" && (
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
                <span>{t("pickDateRange")}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={onCustomDateChange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

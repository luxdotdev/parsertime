"use client";

import { Statistics } from "@/components/stats/player/statistics";
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
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Winrate } from "@/data/scrim-dto";
import { cn } from "@/lib/utils";
import { HeroName, roleHeroMapping } from "@/types/heroes";
import { PlayerStatRows } from "@/types/prisma";
import { Kill, Scrim, User } from "@prisma/client";
import { SelectGroup } from "@radix-ui/react-select";
import { addMonths, addWeeks, addYears, format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";

export type Timeframe =
  | "one-week"
  | "two-weeks"
  | "one-month"
  | "three-months"
  | "six-months"
  | "one-year"
  | "all-time"
  | "custom";

export function RangePicker({
  user,
  data,
  name,
  stats,
  kills,
  mapWinrates,
}: {
  user: User;
  data: Record<Timeframe, Scrim[]>;
  name: string;
  stats: PlayerStatRows;
  kills: Kill[];
  mapWinrates: Winrate;
}) {
  const [timeframe, setTimeframe] = useState<Timeframe>("one-week");
  const [date, setDate] = useState<DateRange | undefined>({
    from: addWeeks(new Date(), -1),
    to: new Date(),
  });
  const [hero, setHero] = useState<HeroName | "all">("all");

  function onTimeframeChange(val: Timeframe) {
    setTimeframe(val);

    if (val === "one-week")
      setDate({ from: addWeeks(new Date(), -1), to: new Date() });
    if (val === "two-weeks")
      setDate({ from: addWeeks(new Date(), -2), to: new Date() });
    if (val === "one-month")
      setDate({ from: addMonths(new Date(), -1), to: new Date() });
    if (val === "three-months")
      setDate({ from: addMonths(new Date(), -3), to: new Date() });
    if (val === "six-months")
      setDate({ from: addMonths(new Date(), -6), to: new Date() });
    if (val === "one-year")
      setDate({ from: addYears(new Date(), -1), to: new Date() });
    if (val === "all-time") setDate({ from: undefined, to: undefined });
  }

  return (
    <main className="space-y-2">
      <div className="items-center gap-2 space-y-2 md:flex md:space-y-0">
        <Select onValueChange={onTimeframeChange} defaultValue="one-week">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Select a timeframe</SelectLabel>
              <SelectItem value="one-week">Last Week</SelectItem>
              <SelectItem value="two-weeks">Last 2 Weeks</SelectItem>
              <SelectItem value="one-month">Last Month</SelectItem>
              <SelectItem
                value="three-months"
                disabled={user.billingPlan === "FREE"}
              >
                Last 3 Months
              </SelectItem>
              <SelectItem
                value="six-months"
                disabled={user.billingPlan === "FREE"}
              >
                Last 6 Months
              </SelectItem>
              <SelectItem
                value="one-year"
                disabled={
                  user.billingPlan === "FREE" || user.billingPlan === "BASIC"
                }
              >
                Last Year
              </SelectItem>
              <SelectItem
                value="all-time"
                disabled={
                  user.billingPlan === "FREE" || user.billingPlan === "BASIC"
                }
              >
                All Time
              </SelectItem>
              <SelectItem
                value="custom"
                disabled={
                  user.billingPlan === "FREE" || user.billingPlan === "BASIC"
                }
              >
                Custom
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        {timeframe === "custom" && (
          <div className="grid gap-2">
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
                    <span>Pick a date</span>
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
          </div>
        )}
      </div>

      <Select
        onValueChange={(val: HeroName) => setHero(val)}
        defaultValue="all"
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Hero" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Select a hero</SelectLabel>
            <SelectItem value="all">All Heroes</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Tank</SelectLabel>
            {roleHeroMapping["Tank"].map((hero) => (
              <SelectItem key={hero} value={hero}>
                {hero}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Damage</SelectLabel>
            {roleHeroMapping["Damage"].map((hero) => (
              <SelectItem key={hero} value={hero}>
                {hero}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Support</SelectLabel>
            {roleHeroMapping["Support"].map((hero) => (
              <SelectItem key={hero} value={hero}>
                {hero}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Statistics
        timeframe={timeframe}
        date={date}
        user={user}
        scrims={data}
        stats={stats}
        hero={hero}
        kills={kills}
        mapWinrates={mapWinrates}
      />
    </main>
  );
}

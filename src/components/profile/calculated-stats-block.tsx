"use client";

import type { Timeframe } from "@/components/stats/player/range-picker";
import { StatFluctuationCards } from "@/components/profile/stat-fluctuation-cards";
import { Link } from "@/components/ui/link";
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
import type { CalculatedStat } from "@prisma/client";
import { useState } from "react";

type Props = {
  calculatedStats: CalculatedStat[];
  permissions: { [key: string]: boolean };
};

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  "one-week": "Last Week",
  "two-weeks": "Last 2 Weeks",
  "one-month": "Last Month",
  "three-months": "Last 3 Months",
  "six-months": "Last 6 Months",
  "one-year": "Last Year",
  "all-time": "All Time",
  custom: "Custom",
};

export function CalculatedStatsBlock({ calculatedStats, permissions }: Props) {
  const initial: Timeframe = permissions["stats-timeframe-1"]
    ? "one-week"
    : permissions["stats-timeframe-2"]
      ? "three-months"
      : "all-time";

  const [timeframe, setTimeframe] = useState<Timeframe>(initial);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={timeframe}
          onValueChange={(val: Timeframe) => setTimeframe(val)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Timeframe</SelectLabel>
              <SelectItem
                value="one-week"
                disabled={!permissions["stats-timeframe-1"]}
              >
                {TIMEFRAME_LABELS["one-week"]}
              </SelectItem>
              <SelectItem
                value="two-weeks"
                disabled={!permissions["stats-timeframe-1"]}
              >
                {TIMEFRAME_LABELS["two-weeks"]}
              </SelectItem>
              <SelectItem
                value="one-month"
                disabled={!permissions["stats-timeframe-1"]}
              >
                {TIMEFRAME_LABELS["one-month"]}
              </SelectItem>
              <SelectItem
                value="three-months"
                disabled={!permissions["stats-timeframe-2"]}
              >
                {TIMEFRAME_LABELS["three-months"]}
              </SelectItem>
              <SelectItem
                value="six-months"
                disabled={!permissions["stats-timeframe-2"]}
              >
                {TIMEFRAME_LABELS["six-months"]}
              </SelectItem>
              <SelectItem
                value="one-year"
                disabled={!permissions["stats-timeframe-3"]}
              >
                {TIMEFRAME_LABELS["one-year"]}
              </SelectItem>
              <SelectItem
                value="all-time"
                disabled={!permissions["stats-timeframe-3"]}
              >
                {TIMEFRAME_LABELS["all-time"]}
              </SelectItem>
            </SelectGroup>
            {!permissions["stats-timeframe-3"] && (
              <>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>
                    <Link href="/pricing" external>
                      Upgrade to view more timeframes
                    </Link>
                  </SelectLabel>
                </SelectGroup>
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      <StatFluctuationCards
        calculatedStats={calculatedStats}
        timeframe={timeframe}
      />
    </div>
  );
}

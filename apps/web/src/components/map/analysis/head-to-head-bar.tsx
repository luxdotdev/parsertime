"use client";

import { cn } from "@/lib/utils";
import { useFormatter } from "next-intl";

type HeadToHeadBarProps = {
  label: string;
  team1Value: number;
  team2Value: number;
  team1Name: string;
  team2Name: string;
  team1Color: string;
  team2Color: string;
  format?: "percentage" | "count" | "time";
  unit?: string;
};

export function HeadToHeadBar({
  label,
  team1Value,
  team2Value,
  team1Name,
  team2Name,
  team1Color,
  team2Color,
  format = "count",
  unit,
}: HeadToHeadBarProps) {
  const formatter = useFormatter();
  const total = team1Value + team2Value;
  const team1Pct = total > 0 ? (team1Value / total) * 100 : 50;
  const team2Pct = total > 0 ? 100 - team1Pct : 50;

  function formatValue(value: number) {
    switch (format) {
      case "percentage":
        return formatter.number(value / 100, {
          maximumFractionDigits: 1,
          style: "percent",
        });
      case "time":
        return formatter.number(value, {
          maximumFractionDigits: 1,
          style: "unit",
          unit: "second",
          unitDisplay: "narrow",
        });
      case "count":
      default:
        return formatter.number(value, { maximumFractionDigits: 0 });
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="text-muted-foreground flex items-center justify-between font-mono text-[11px] tracking-[0.06em] uppercase">
        <span>{label}</span>
        <span className="tabular-nums">
          {formatValue(team1Value)} &ndash; {formatValue(team2Value)}
        </span>
      </div>
      <div className="flex h-7 w-full gap-px overflow-hidden rounded-md shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
        <div
          className={cn(
            "flex items-center justify-center text-xs font-semibold text-white tabular-nums transition-[width] duration-300 ease-out [text-shadow:0_0_2px_rgba(0,0,0,0.4)] motion-reduce:transition-none",
            team1Pct < 15 && "justify-start pl-1"
          )}
          style={{
            width: `${Math.max(team1Pct, 2)}%`,
            backgroundColor: team1Color,
          }}
        >
          {team1Pct >= 15 && (
            <span className="truncate px-1.5">
              {team1Name}
              <span className="mx-1 opacity-50">&middot;</span>
              {formatValue(team1Value)}
              {unit && <span className="ml-0.5 font-normal">{unit}</span>}
            </span>
          )}
        </div>
        <div
          className={cn(
            "flex items-center justify-center text-xs font-semibold text-white tabular-nums transition-[width] duration-300 ease-out [text-shadow:0_0_2px_rgba(0,0,0,0.4)] motion-reduce:transition-none",
            team2Pct < 15 && "justify-end pr-1"
          )}
          style={{
            width: `${Math.max(team2Pct, 2)}%`,
            backgroundColor: team2Color,
          }}
        >
          {team2Pct >= 15 && (
            <span className="truncate px-1.5">
              {team2Name}
              <span className="mx-1 opacity-50">&middot;</span>
              {formatValue(team2Value)}
              {unit && <span className="ml-0.5 font-normal">{unit}</span>}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

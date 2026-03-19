"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type EvalBarProps = {
  team1Score: number;
  team2Score: number;
  team1Name: string;
  team2Name: string;
  team1Color: string;
  team2Color: string;
};

export function EvalBar({
  team1Score,
  team2Score,
  team1Name,
  team2Name,
  team1Color,
  team2Color,
}: EvalBarProps) {
  const total = team1Score + team2Score;
  const team1Pct = total > 0 ? (team1Score / total) * 100 : 50;
  const team2Pct = 100 - team1Pct;

  const diff = team1Score - team2Score;
  const sign = diff > 0 ? "+" : "";
  const label = `${sign}${diff.toFixed(2)}`;
  const leading = diff > 0 ? team1Name : diff < 0 ? team2Name : "Even";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="border-border/50 flex w-6 shrink-0 cursor-default flex-col overflow-hidden rounded-md border"
          aria-label={`${leading} ${label}`}
        >
          <div
            className="transition-all duration-300"
            style={{
              height: `${team1Pct}%`,
              backgroundColor: team1Color,
            }}
          />
          <div
            className="transition-all duration-300"
            style={{
              height: `${team2Pct}%`,
              backgroundColor: team2Color,
            }}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs">
        <p className="font-medium">{leading}</p>
        <p className="text-muted-foreground font-mono tabular-nums">{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

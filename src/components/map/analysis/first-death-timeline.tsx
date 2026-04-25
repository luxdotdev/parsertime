"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toTimestamp } from "@/lib/utils";

export type FightFirstDeath = {
  fightNumber: number;
  matchTime: number;
  victimName: string;
  victimHero: string;
  victimTeam: "team1" | "team2";
};

type FirstDeathTimelineProps = {
  fights: FightFirstDeath[];
  team1: { name: string; color: string };
  team2: { name: string; color: string };
};

function longestStreak(
  fights: FightFirstDeath[],
  team: "team1" | "team2"
): number {
  let max = 0;
  let current = 0;
  for (const f of fights) {
    if (f.victimTeam === team) {
      current++;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  }
  return max;
}

export function FirstDeathTimeline({
  fights,
  team1,
  team2,
}: FirstDeathTimelineProps) {
  if (fights.length === 0) return null;

  // Compute running differential: positive = team1 has more first deaths (bad for team1)
  const diffs: number[] = [];
  let running = 0;
  for (const f of fights) {
    running += f.victimTeam === "team1" ? 1 : -1;
    diffs.push(running);
  }

  const maxAbs = Math.max(
    Math.abs(Math.min(...diffs)),
    Math.abs(Math.max(...diffs)),
    1
  );

  const team1Streak = longestStreak(fights, "team1");
  const team2Streak = longestStreak(fights, "team2");
  const worstStreak =
    team1Streak >= team2Streak
      ? { team: team1.name, color: team1.color, count: team1Streak }
      : { team: team2.name, color: team2.color, count: team2Streak };

  return (
    <div className="space-y-3">
      {/* Fight strip */}
      <div>
        <div className="text-muted-foreground mb-1.5 flex items-center justify-between font-mono text-[10px] tracking-[0.06em] uppercase">
          <span>Fight-by-fight first deaths</span>
          <span className="tabular-nums">{fights.length} fights</span>
        </div>
        <div className="flex gap-0.5">
          {fights.map((f) => {
            const color = f.victimTeam === "team1" ? team1.color : team2.color;
            const teamName = f.victimTeam === "team1" ? team1.name : team2.name;
            return (
              <Tooltip key={f.fightNumber}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="focus-visible:ring-ring focus-visible:ring-offset-background relative h-6 min-w-0 flex-1 rounded-sm transition-[opacity] hover:opacity-80 focus-visible:ring-2 focus-visible:ring-offset-1 motion-reduce:transition-none"
                    style={{ backgroundColor: color }}
                    aria-label={`Fight ${f.fightNumber}: ${f.victimName} (${f.victimHero}) died first for ${teamName}`}
                  >
                    {fights.length <= 20 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white tabular-nums [text-shadow:0_0_2px_rgba(0,0,0,0.5)]">
                        {f.fightNumber}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-0.5">
                    <div className="font-semibold">
                      Fight {f.fightNumber}{" "}
                      <span className="text-muted-foreground font-normal">
                        {toTimestamp(f.matchTime)}
                      </span>
                    </div>
                    <div>
                      <span style={{ color }}>{teamName}</span> first death:{" "}
                      <span className="font-semibold">{f.victimName}</span> (
                      {f.victimHero})
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        {/* Legend */}
        <div className="text-muted-foreground mt-1 flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span
              className="inline-block size-2 rounded-sm"
              style={{ backgroundColor: team1.color }}
            />
            {team1.name} died first
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block size-2 rounded-sm"
              style={{ backgroundColor: team2.color }}
            />
            {team2.name} died first
          </span>
        </div>
      </div>

      {/* Momentum chart */}
      <div>
        <div className="text-muted-foreground mb-1.5 font-mono text-[10px] tracking-[0.06em] uppercase">
          First death momentum
        </div>
        <div className="bg-muted/30 border-border relative h-16 w-full overflow-hidden rounded-md border">
          {/* Center line */}
          <div className="border-muted-foreground/20 absolute top-1/2 right-0 left-0 border-t border-dashed" />
          {/* Team labels on edges */}
          <div
            className="absolute top-1 left-2 text-[9px] font-medium opacity-50"
            style={{ color: team1.color }}
          >
            {team1.name} dying more
          </div>
          <div
            className="absolute bottom-1 left-2 text-[9px] font-medium opacity-50"
            style={{ color: team2.color }}
          >
            {team2.name} dying more
          </div>
          {/* SVG line */}
          <svg
            viewBox={`0 0 ${fights.length - 1 || 1} ${maxAbs * 2}`}
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
          >
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth={0.15}
              className="text-foreground/40"
              points={diffs.map((d, i) => `${i},${maxAbs - d}`).join(" ")}
            />
            {diffs.map((d, i) => {
              const fight = fights[i];
              const color =
                fight.victimTeam === "team1" ? team1.color : team2.color;
              return (
                <circle
                  key={fight.fightNumber}
                  cx={i}
                  cy={maxAbs - d}
                  r={0.2}
                  fill={color}
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Streak callout */}
      {worstStreak.count >= 3 && (
        <p className="text-muted-foreground text-xs">
          Longest first death streak:{" "}
          <span className="font-semibold" style={{ color: worstStreak.color }}>
            {worstStreak.team}
          </span>{" "}
          died first in{" "}
          <span className="font-semibold tabular-nums">
            {worstStreak.count}
          </span>{" "}
          consecutive fights
        </p>
      )}
    </div>
  );
}

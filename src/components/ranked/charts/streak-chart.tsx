import { SectionHeader } from "@/components/stats/team/section-header";
import { cn } from "@/lib/utils";
import type { StreakData } from "@/lib/ranked-stats";

type StreakChartProps = {
  data: StreakData;
};

function ResultChip({
  result,
  index,
}: {
  result: "win" | "loss" | "draw";
  index: number;
}) {
  const label =
    result === "win" ? "Win" : result === "loss" ? "Loss" : "Draw";
  return (
    <div
      role="img"
      aria-label={`Game ${index + 1}: ${label}`}
      className={cn(
        "size-5 shrink-0 rounded-sm",
        result === "win" && "bg-chart-win",
        result === "loss" && "bg-chart-loss",
        result === "draw" && "bg-muted-foreground/40"
      )}
    />
  );
}

function StatBlock({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: string;
  colorClass?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={cn("font-mono text-2xl font-bold tabular-nums", colorClass)}>
        {value}
      </span>
    </div>
  );
}

export function StreakChart({ data }: StreakChartProps) {
  const {
    currentStreak,
    currentStreakType,
    longestWinStreak,
    longestLossStreak,
    recentResults,
  } = data;

  const currentValue =
    currentStreakType === "none"
      ? "\u2014"
      : `${currentStreak}${currentStreakType === "win" ? "W" : "L"}`;

  const currentColorClass =
    currentStreakType === "win"
      ? "text-chart-win"
      : currentStreakType === "loss"
        ? "text-chart-loss"
        : "";

  const description =
    currentStreakType === "win"
      ? `${currentStreak}-game win streak — keep it going`
      : currentStreakType === "loss"
        ? `${currentStreak}-game loss streak — time to turn it around`
        : "No active streak";

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Streaks"
        title="Streak"
        description={description}
      />
      <div className="space-y-5">
        <div className="flex items-end gap-6">
          <StatBlock
            label="Current streak"
            value={currentValue}
            colorClass={currentColorClass}
          />
          <StatBlock
            label="Longest win streak"
            value={longestWinStreak > 0 ? `${longestWinStreak}W` : "\u2014"}
            colorClass={longestWinStreak > 0 ? "text-chart-win" : ""}
          />
          <StatBlock
            label="Longest loss streak"
            value={longestLossStreak > 0 ? `${longestLossStreak}L` : "\u2014"}
            colorClass={longestLossStreak > 0 ? "text-chart-loss" : ""}
          />
        </div>

        {recentResults.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs">
              Last {recentResults.length} games
            </p>
            <div
              className="flex flex-wrap gap-1"
              role="list"
              aria-label={`Last ${recentResults.length} game results`}
            >
              {recentResults.map(({ matchId, result }, i) => (
                <div key={matchId} role="listitem">
                  <ResultChip result={result} index={i} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        Most recent results shown left to right
      </p>
    </section>
  );
}

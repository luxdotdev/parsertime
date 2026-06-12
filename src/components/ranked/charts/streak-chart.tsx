import { SectionHeader } from "@/components/stats/team/section-header";
import { cn } from "@/lib/utils";
import type { StreakData } from "@/lib/ranked-stats";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("ranked.charts.streak");
  const label =
    result === "win"
      ? t("resultWin")
      : result === "loss"
        ? t("resultLoss")
        : t("resultDraw");
  return (
    <div
      role="img"
      aria-label={t("chipLabel", { index: index + 1, result: label })}
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
  const t = useTranslations("ranked.charts.streak");
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
      : currentStreakType === "win"
        ? t("winValue", { count: currentStreak })
        : t("lossValue", { count: currentStreak });

  const currentColorClass =
    currentStreakType === "win"
      ? "text-chart-win"
      : currentStreakType === "loss"
        ? "text-chart-loss"
        : "";

  const description =
    currentStreakType === "win"
      ? t("descriptionWin", { count: currentStreak })
      : currentStreakType === "loss"
        ? t("descriptionLoss", { count: currentStreak })
        : t("descriptionNone");

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={description}
      />
      <div className="space-y-5">
        <div className="flex items-end gap-6">
          <StatBlock
            label={t("currentStreak")}
            value={currentValue}
            colorClass={currentColorClass}
          />
          <StatBlock
            label={t("longestWinStreak")}
            value={longestWinStreak > 0 ? t("winValue", { count: longestWinStreak }) : "\u2014"}
            colorClass={longestWinStreak > 0 ? "text-chart-win" : ""}
          />
          <StatBlock
            label={t("longestLossStreak")}
            value={longestLossStreak > 0 ? t("lossValue", { count: longestLossStreak }) : "\u2014"}
            colorClass={longestLossStreak > 0 ? "text-chart-loss" : ""}
          />
        </div>

        {recentResults.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs">
              {t("lastGames", { count: recentResults.length })}
            </p>
            <div
              className="flex flex-wrap gap-1"
              role="list"
              aria-label={t("lastGamesResults", { count: recentResults.length })}
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
      <p className="text-muted-foreground text-xs">{t("footer")}</p>
    </section>
  );
}

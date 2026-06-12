"use client";

import type { MatchStoryInsight } from "@/lib/win-probability/timeline";
import { useTranslations } from "next-intl";

type Translate = ReturnType<typeof useTranslations<"mapPage.matchStory">>;

function insightText(t: Translate, insight: MatchStoryInsight): string | null {
  switch (insight.key) {
    case "insights.biggestSwing":
      return t("insights.biggestSwing", {
        fight: insight.values.fight as number,
        swing: insight.values.swing as number,
        team: insight.values.team as string,
      });
    case "insights.ultCarryover":
      return t("insights.ultCarryover", {
        fight: insight.values.fight as number,
        prevFight: insight.values.prevFight as number,
        cost: insight.values.cost as number,
        team: insight.values.team as string,
      });
    case "insights.staggerCarryover":
      return t("insights.staggerCarryover", {
        fight: insight.values.fight as number,
        cost: insight.values.cost as number,
        team: insight.values.team as string,
      });
    default:
      return null;
  }
}

function insightFigure(insight: MatchStoryInsight): number | null {
  const v = insight.values.swing ?? insight.values.cost;
  return typeof v === "number" ? v : null;
}

export function InsightsStrip({
  insights,
  focusFight,
  onFocusFight,
}: {
  insights: MatchStoryInsight[];
  focusFight: number | null;
  onFocusFight: (index: number | null) => void;
}) {
  const t = useTranslations("mapPage.matchStory");
  if (insights.length === 0) return null;
  return (
    <div className="border-border border">
      <p className="text-muted-foreground border-border border-b px-3 py-1.5 font-mono text-[10px] tracking-[0.08em] uppercase">
        {t("insights.title")}
      </p>
      <ul className="divide-border divide-y">
        {insights.map((insight) => {
          const text = insightText(t, insight);
          if (text === null) return null;
          const figure = insightFigure(insight);
          const fight = insight.values.fight;
          const fightIndex = typeof fight === "number" ? fight - 1 : null;
          const isFocus = fightIndex !== null && focusFight === fightIndex;
          return (
            <li key={`${insight.key}-${JSON.stringify(insight.values)}`}>
              <button
                type="button"
                onClick={() =>
                  onFocusFight(isFocus ? null : (fightIndex ?? null))
                }
                onMouseEnter={() =>
                  fightIndex !== null && onFocusFight(fightIndex)
                }
                className={`flex w-full items-baseline gap-3 px-3 py-2 text-left text-sm transition-colors duration-150 motion-reduce:transition-none ${
                  isFocus ? "bg-muted" : "hover:bg-muted/60"
                }`}
              >
                {figure !== null ? (
                  <span className="text-primary w-12 shrink-0 text-right font-mono text-base font-semibold tabular-nums">
                    {figure}%
                  </span>
                ) : null}
                <span>{text}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

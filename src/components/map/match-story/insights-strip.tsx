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

export function InsightsStrip({ insights }: { insights: MatchStoryInsight[] }) {
  const t = useTranslations("mapPage.matchStory");
  if (insights.length === 0) return null;
  return (
    <div className="border-border border">
      <p className="text-primary border-border border-b px-3 py-1.5 font-mono text-[10px] uppercase">
        {t("insights.title")}
      </p>
      <ul className="divide-border divide-y">
        {insights.map((insight) => {
          const text = insightText(t, insight);
          if (text === null) return null;
          return (
            <li
              key={`${insight.key}-${JSON.stringify(insight.values)}`}
              className="px-3 py-2 text-sm"
            >
              {text}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

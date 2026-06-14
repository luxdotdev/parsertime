"use client";

import type { MatchStoryInsight } from "@/lib/win-probability/timeline";
import { useTranslations } from "next-intl";

type Translate = ReturnType<typeof useTranslations<"mapPage.matchStory">>;

function insightText(t: Translate, insight: MatchStoryInsight): string | null {
  switch (insight.key) {
    case "insights.biggestSwing":
    case "insights.biggestSwingObjective":
    case "insights.biggestSwingKills":
    case "insights.biggestSwingUlts":
      return t(insight.key, {
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
    case "insights.earlyControl":
      return t("insights.earlyControl", {
        team: insight.values.team as string,
        wins: insight.values.wins as number,
        of: insight.values.of as number,
      });
    case "insights.longStretch":
      return t("insights.longStretch", {
        team: insight.values.team as string,
        duration: insight.values.duration as string,
        pct: insight.values.pct as number,
      });
    case "insights.winStreak":
      return t("insights.winStreak", {
        team: insight.values.team as string,
        count: insight.values.count as number,
        from: insight.values.from as string,
        to: insight.values.to as string,
      });
    case "insights.closing":
      return t("insights.closing", {
        team: insight.values.team as string,
        wins: insight.values.wins as number,
        of: insight.values.of as number,
      });
    case "insights.topWpa":
      return t("insights.topWpa", {
        player: insight.values.player as string,
        team: insight.values.team as string,
        wpa: insight.values.wpa as number,
      });
    case "takeaways.lossProfileObjective":
    case "takeaways.lossProfileKills":
    case "takeaways.lossProfileUlts":
      return t(insight.key, {
        pct: insight.values.pct as number,
        count: insight.values.count as number,
      });
    case "takeaways.ultDiscipline":
      return t("takeaways.ultDiscipline", {
        extra: insight.values.extra as number,
        count: insight.values.count as number,
        fights: insight.values.fights as string,
      });
    case "takeaways.staggers":
      return t("takeaways.staggers", {
        count: insight.values.count as number,
        cost: insight.values.cost as number,
        fights: insight.values.fights as string,
      });
    case "takeaways.ultDeficit":
      return t("takeaways.ultDeficit", {
        count: insight.values.count as number,
        cost: insight.values.cost as number,
        fights: insight.values.fights as string,
      });
    case "takeaways.firstDeaths":
      return t("takeaways.firstDeaths", {
        player: insight.values.player as string,
        count: insight.values.count as number,
        of: insight.values.of as number,
        fights: insight.values.fights as string,
      });
    default:
      return null;
  }
}

function insightFigure(insight: MatchStoryInsight): number | null {
  const v =
    insight.values.swing ??
    insight.values.cost ??
    insight.values.pct ??
    insight.values.wpa;
  return typeof v === "number" ? v : null;
}

export function InsightsStrip({
  title,
  insights,
  focusFight,
  onFocusFight,
}: {
  title: string;
  insights: MatchStoryInsight[];
  focusFight: number | null;
  onFocusFight: (index: number | null) => void;
}) {
  const t = useTranslations("mapPage.matchStory");
  if (insights.length === 0) return null;
  return (
    <div className="border-border overflow-hidden rounded-md border">
      <p className="text-muted-foreground bg-muted/30 border-border border-b px-4 py-2 font-mono text-[10px] tracking-[0.16em] uppercase">
        {title}
      </p>
      <ul className="divide-border divide-y">
        {insights.map((insight) => {
          const text = insightText(t, insight);
          if (text === null) return null;
          const figure = insightFigure(insight);
          const fightIndex = insight.fightIndex ?? null;
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
                className={`flex w-full items-baseline gap-3 px-4 py-3 text-left text-sm transition-colors duration-150 motion-reduce:transition-none ${
                  isFocus ? "bg-muted/50" : "hover:bg-muted/30"
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

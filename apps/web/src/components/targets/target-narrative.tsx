"use client";

import type { TargetProgress } from "@/data/player/types";
import { getStatConfig } from "@/lib/target-stats";
import { round } from "@/lib/utils";
import { useFormatter, useTranslations } from "next-intl";

type Props = {
  progress: TargetProgress;
};

export function TargetNarrative({ progress }: Props) {
  const t = useTranslations("targets");
  const formatter = useFormatter();
  const { target, currentValue, progressPercent, trending } = progress;
  const config = getStatConfig(target.stat);
  if (!config) return null;

  const changeFromBaseline =
    ((currentValue - target.baselineValue) / target.baselineValue) * 100;
  const changeDirection =
    changeFromBaseline >= 0
      ? t("narrative.increased")
      : t("narrative.decreased");
  const percentClassName =
    trending === "toward"
      ? "text-green-500"
      : trending === "away"
        ? "text-red-500"
        : "text-foreground";
  const progressClassName =
    progressPercent >= 75
      ? "text-green-500"
      : progressPercent >= 25
        ? "text-yellow-500"
        : "text-red-500";

  return (
    <div className="space-y-1 text-sm">
      <p className="text-muted-foreground">
        {t.rich("narrative.changedRich", {
          stat: t(`stats.${target.stat}`).toLowerCase(),
          direction: changeDirection,
          percent: formatter.number(Math.abs(changeFromBaseline) / 100, {
            style: "percent",
            maximumFractionDigits: 0,
          }),
          window: target.scrimWindow,
          percentValue: (chunks) => (
            <span
              className={percentClassName}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {chunks}
            </span>
          ),
        })}{" "}
        {progressPercent >= 100 ? (
          <span className="font-medium text-green-500">
            {t("targetAchieved")}
          </span>
        ) : (
          t.rich("narrative.progressTowardRich", {
            percent: formatter.number(round(progressPercent) / 100, {
              style: "percent",
              maximumFractionDigits: 0,
            }),
            targetDirection: target.targetDirection === "decrease" ? "-" : "+",
            targetPercent: formatter.number(target.targetPercent / 100, {
              style: "percent",
              maximumFractionDigits: 1,
            }),
            percentValue: (chunks) => (
              <span
                className={progressClassName}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {chunks}
              </span>
            ),
          })
        )}
      </p>
      {target.note && (
        <p className="text-muted-foreground italic">
          {t("coachNote")}: {target.note}
        </p>
      )}
    </div>
  );
}

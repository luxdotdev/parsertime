import type { TargetProgress } from "@/data/player/types";
import { getStatConfig } from "@/lib/target-stats";
import { round } from "@/lib/utils";

type Props = {
  progress: TargetProgress;
};

export function TargetNarrative({ progress }: Props) {
  const { target, currentValue, progressPercent, trending } = progress;
  const config = getStatConfig(target.stat);
  if (!config) return null;

  const changeFromBaseline =
    ((currentValue - target.baselineValue) / target.baselineValue) * 100;
  const changeDirection = changeFromBaseline >= 0 ? "increased" : "decreased";

  return (
    <div className="space-y-1 text-sm">
      <p className="text-muted-foreground">
        Your {config.displayName.toLowerCase()} has {changeDirection} by{" "}
        <span
          className={
            trending === "toward"
              ? "text-green-500"
              : trending === "away"
                ? "text-red-500"
                : "text-foreground"
          }
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {round(Math.abs(changeFromBaseline))}%
        </span>{" "}
        over the last {target.scrimWindow} scrims.{" "}
        {progressPercent >= 100 ? (
          <span className="font-medium text-green-500">Target achieved!</span>
        ) : (
          <>
            You&apos;re{" "}
            <span
              className={
                progressPercent >= 75
                  ? "text-green-500"
                  : progressPercent >= 25
                    ? "text-yellow-500"
                    : "text-red-500"
              }
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {round(progressPercent)}%
            </span>{" "}
            of the way to your target of{" "}
            {target.targetDirection === "decrease" ? "-" : "+"}
            {target.targetPercent}%.
          </>
        )}
      </p>
      {target.note && (
        <p className="text-muted-foreground italic">
          Coach&apos;s note: {target.note}
        </p>
      )}
    </div>
  );
}

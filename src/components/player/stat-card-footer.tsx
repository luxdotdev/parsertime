import type { StatCardComparison } from "@/lib/stat-card-helpers";
import { getTranslations } from "next-intl/server";

type StatCardFooterProps = {
  baseText: string;
  comparison?: StatCardComparison | null;
};

export async function StatCardFooter({
  baseText,
  comparison,
}: StatCardFooterProps) {
  const t = await getTranslations("mapPage.compare.playerCard");

  if (!comparison) {
    return <div className="text-muted-foreground text-sm">{baseText}</div>;
  }

  return (
    <div className="text-muted-foreground space-y-0.5 text-xs">
      <div className="text-sm">{baseText}</div>
      <div className="flex items-center gap-2">
        <span>
          {comparison.zScore > 0 ? "+" : ""}
          {comparison.zScore.toFixed(2)}σ
        </span>
        <span>•</span>
        <span>
          {t("percentile", { percentile: comparison.percentile.toFixed(0) })}
        </span>
      </div>
    </div>
  );
}

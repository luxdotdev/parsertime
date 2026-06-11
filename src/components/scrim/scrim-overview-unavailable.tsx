import { BarChart3 } from "lucide-react";
import { getTranslations } from "next-intl/server";

/**
 * Compact notice shown in place of the scrim overview card when a team is too
 * new for the roster-identity heuristic to tell which side is theirs (fewer
 * than two uploaded scrims). Kept slim so it marks where the overview will
 * appear without pushing the maps list down the page.
 */
export async function ScrimOverviewUnavailable() {
  const t = await getTranslations("scrimPage.overviewUnavailable");

  return (
    <div className="bg-muted/40 flex items-start gap-3 rounded-lg border p-4">
      <div className="bg-background text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-md border">
        <BarChart3 className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-sm leading-snug font-medium">{t("title")}</p>
        <p className="text-muted-foreground text-sm leading-snug">
          {t("description")}
        </p>
      </div>
    </div>
  );
}

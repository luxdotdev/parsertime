"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  ScoutingRecommendation,
  ScoutingRecommendations as ScoutingRecommendationsType,
} from "@/data/scouting-dto";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type ScoutingRecommendationsProps = {
  recommendations: ScoutingRecommendationsType;
};

export function ScoutingRecommendations({
  recommendations,
}: ScoutingRecommendationsProps) {
  const t = useTranslations("scoutingPage.team.recommendations");

  const hasAny =
    recommendations.suggestedBans.length > 0 ||
    recommendations.suggestedMapPicks.length > 0 ||
    recommendations.suggestedMapAvoids.length > 0;

  if (!hasAny) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-6 text-center text-sm">
            {t("noRecommendations")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <RecommendationCard
          title={t("heroesToBan")}
          description={t("heroesToBanDescription")}
          items={recommendations.suggestedBans}
          variant="ban"
        />
        <RecommendationCard
          title={t("mapsToPick")}
          description={t("mapsToPickDescription")}
          items={recommendations.suggestedMapPicks}
          variant="pick"
        />
        <RecommendationCard
          title={t("mapsToAvoid")}
          description={t("mapsToAvoidDescription")}
          items={recommendations.suggestedMapAvoids}
          variant="avoid"
        />
      </div>
    </div>
  );
}

type RecommendationCardProps = {
  title: string;
  description: string;
  items: ScoutingRecommendation[];
  variant: "ban" | "pick" | "avoid";
};

function RecommendationCard({
  title,
  description,
  items,
  variant,
}: RecommendationCardProps) {
  const t = useTranslations("scoutingPage.team.recommendations");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <ol className="space-y-3">
            {items.map((item, i) => (
              <li key={item.name} className="flex items-start gap-3">
                <span className="text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.name}</span>
                    <ConfidenceBadge sampleSize={item.sampleSize} />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {item.reason}
                  </p>
                  {variant !== "ban" && (
                    <span
                      className={cn(
                        "mt-0.5 inline-block text-xs font-medium tabular-nums",
                        variant === "pick"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {item.weightedWinRate.toFixed(0)}% {t("weightedWinRate")}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-muted-foreground py-4 text-center text-sm">
            {t("noRecommendations")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ConfidenceBadge({ sampleSize }: { sampleSize: number }) {
  const t = useTranslations("scoutingPage.team.recommendations");

  const level =
    sampleSize >= 10 ? "high" : sampleSize >= 5 ? "medium" : "low";

  return (
    <Badge
      variant={level === "high" ? "default" : "secondary"}
      className="text-[10px]"
    >
      {t(`confidence.${level}`)}
    </Badge>
  );
}

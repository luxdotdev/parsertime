"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { InsightItem } from "@/data/player-scouting-analytics-dto";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Map,
  Shield,
  Sword,
  Target,
  TrendingUp,
} from "lucide-react";
import { useTranslations } from "next-intl";

type PlayerStrengthsWeaknessesProps = {
  strengths: InsightItem[];
  weaknesses: InsightItem[];
};

const CATEGORY_ICONS: Record<
  InsightItem["category"],
  React.ComponentType<{ className?: string }>
> = {
  hero: Target,
  map: Map,
  stat: TrendingUp,
  combat: Sword,
};

export function PlayerStrengthsWeaknesses({
  strengths,
  weaknesses,
}: PlayerStrengthsWeaknessesProps) {
  const t = useTranslations(
    "scoutingPage.player.analytics.strengthsWeaknesses"
  );

  if (strengths.length === 0 && weaknesses.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="strengths-weaknesses-heading">
      <Card>
        <CardHeader>
          <CardTitle id="strengths-weaknesses-heading">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                <Shield className="h-4 w-4" aria-hidden="true" />
                {t("strengths")}
              </h4>
              {strengths.length > 0 ? (
                <div className="space-y-2">
                  {strengths.map((item) => (
                    <InsightRow
                      key={item.label}
                      item={item}
                      variant="strength"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t("noStrengths")}
                </p>
              )}
            </div>

            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                {t("weaknesses")}
              </h4>
              {weaknesses.length > 0 ? (
                <div className="space-y-2">
                  {weaknesses.map((item) => (
                    <InsightRow
                      key={item.label}
                      item={item}
                      variant="weakness"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t("noWeaknesses")}
                </p>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-xs">{t("methodology")}</p>
        </CardFooter>
      </Card>
    </section>
  );
}

function InsightRow({
  item,
  variant,
}: {
  item: InsightItem;
  variant: "strength" | "weakness";
}) {
  const Icon = CATEGORY_ICONS[item.category];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3",
        variant === "strength"
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-red-500/20 bg-red-500/5"
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          variant === "strength"
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-600 dark:text-red-400"
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{item.label}</p>
          <Badge variant="outline" className="px-1 py-0 text-[9px] uppercase">
            {item.category}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">{item.detail}</p>
      </div>
    </div>
  );
}

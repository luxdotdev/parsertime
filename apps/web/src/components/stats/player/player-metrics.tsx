import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatter, useTranslations } from "next-intl";

type PlayerMetricsProps = {
  metrics: {
    mvpScore: number;
    fletaDeadliftPercentage: number;
    firstPickPercentage: number;
    firstPickCount: number;
    firstDeathPercentage: number;
    firstDeathCount: number;
    fightReversalPercentage: number;
    droughtTime: number;
    averageUltChargeTime: number;
    averageTimeToUseUlt: number;
    killsPerUltimate: number;
    ajaxCount: number;
    mapMVPCount: number;
  };
};

export function PlayerMetrics({ metrics }: PlayerMetricsProps) {
  const t = useTranslations("statsPage.playerMetrics");
  const format = useFormatter();

  function formatPercent(value: number): string {
    return format.number(value / 100, {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }

  function formatDecimal(value: number, digits: number): string {
    return format.number(value, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  function formatSeconds(value: number): string {
    return format.number(value, {
      style: "unit",
      unit: "second",
      unitDisplay: "short",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("mvpScore")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatDecimal(metrics.mvpScore, 1)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("fletaDeadliftPercentage")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatPercent(metrics.fletaDeadliftPercentage)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("firstPickPercentage")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatPercent(metrics.firstPickPercentage)}
          </div>
          <p className="text-muted-foreground text-xs">
            {t("totalFirstPicks", { count: metrics.firstPickCount })}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("firstDeathPercentage")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatPercent(metrics.firstDeathPercentage)}
          </div>
          <p className="text-muted-foreground text-xs">
            {t("totalFirstDeaths", { count: metrics.firstDeathCount })}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("fightReversalPercentage")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatPercent(metrics.fightReversalPercentage)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("killsPerUltimate")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatDecimal(metrics.killsPerUltimate, 2)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("averageUltChargeTime")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatSeconds(metrics.averageUltChargeTime)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("droughtTime")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatSeconds(metrics.droughtTime)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("mapMVPCount")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {format.number(metrics.mapMVPCount)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

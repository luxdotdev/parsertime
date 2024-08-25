import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

export default function StatsLoading() {
  const t = useTranslations("statsPage.playerStats");
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <Skeleton className="h-9 w-[200px]" />
      </div>

      <main className="space-y-2">
        <div className="items-center gap-2 space-y-2 md:flex md:space-y-0">
          <Skeleton className="h-9 w-[180px]" />
        </div>
        <div className="items-center gap-2 space-y-2 md:flex md:space-y-0">
          <Skeleton className="h-9 w-[180px]" />
        </div>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="col-span-1 md:col-span-2 xl:col-span-1">
            <CardHeader>
              <CardTitle>{t("mostPlayed.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72" />
            </CardContent>
          </Card>
          <Card className="col-span-1 md:col-span-2 xl:col-span-1">
            <CardHeader>
              <CardTitle>{t("bestPerformance.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72" />
            </CardContent>
          </Card>
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>{t("avgHeroDmgDealtPer10.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72" />
            </CardContent>
          </Card>
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>{t("avgDeathPer10.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72" />
            </CardContent>
          </Card>
          <Card className="col-span-1 md:col-span-2 xl:col-span-1">
            <CardHeader>
              <CardTitle>{t("timeSpent.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72" />
            </CardContent>
          </Card>
          <Card className="col-span-1 md:col-span-2 xl:col-span-1">
            <CardHeader>
              <CardTitle>{t("finalBlowsByMethod.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72" />
            </CardContent>
          </Card>
          <Card className="col-span-full xl:col-span-3">
            <CardHeader>
              <CardTitle>{t("mapWinrates.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72" />
            </CardContent>
          </Card>
          <Card className="col-span-1 md:col-span-2 xl:col-span-1">
            <CardHeader>
              <CardTitle>{t("winrateMapType.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72" />
            </CardContent>
          </Card>
          <Card className="col-span-1 md:col-span-2 xl:col-span-1">
            <CardHeader>
              <CardTitle>{t("heroesDiedToMost.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72" />
            </CardContent>
          </Card>
          <Card className="col-span-1 md:col-span-2 xl:col-span-1">
            <CardHeader>
              <CardTitle>{t("heroesElimMost.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72" />
            </CardContent>
          </Card>
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor="stat">{t("stats.title")}</Label>
                  <Skeleton className="h-6 w-[180px]" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72" />
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

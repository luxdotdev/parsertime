import { DirectionalTransition } from "@/components/directional-transition";
import { StatPanel } from "@/components/player/stat-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTranslations } from "next-intl/server";

const STAT_BLOCK_SLOTS = ["a", "b", "c", "d"] as const;
const HERO_STAT_SLOTS = ["a", "b", "c", "d", "e", "f"] as const;

export default async function PlayerDashboardLoading() {
  const t = await getTranslations("mapPage.player");

  return (
    <DirectionalTransition>
      <div className="flex-col md:flex">
        <header
          className="shadow-xs"
          style={{ viewTransitionName: "site-header" }}
        >
          <div className="hidden min-h-16 items-center px-4 py-2 md:flex">
            <Skeleton className="h-6 w-24" />
            <div className="ml-auto flex items-center space-x-4">
              <Skeleton className="border-input hidden h-9 w-full rounded-md border px-3 py-1 md:flex md:w-[100px] lg:w-[300px]" />
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
          <div className="flex h-16 items-center px-4 md:hidden">
            <Skeleton className="h-6 w-24" />
            <div className="ml-auto flex items-center space-x-4">
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </header>
        <div className="flex-1 px-6 pt-6 pb-12 md:px-8">
          <div className="text-muted-foreground flex items-center gap-3 text-sm">
            <Skeleton className="h-4 w-32" />
            <span className="text-muted-foreground/40" aria-hidden="true">
              |
            </span>
            <Skeleton className="h-4 w-32" />
          </div>

          <div className="mt-3">
            <Skeleton className="h-8 w-48" />
          </div>

          <div className="mt-2 flex items-center gap-3">
            <Skeleton className="h-3 w-20" />
            <span className="text-muted-foreground/40" aria-hidden="true">
              ·
            </span>
            <Skeleton className="h-3 w-16" />
            <span className="text-muted-foreground/40" aria-hidden="true">
              ·
            </span>
            <Skeleton className="h-3 w-24" />
          </div>

          <Tabs defaultValue="overview" className="mt-6 space-y-4">
            <TabsList aria-label="Player sections">
              <TabsTrigger value="overview">
                {t("dashboard.overview")}
              </TabsTrigger>
              <TabsTrigger value="analytics">
                {t("dashboard.analytics")}
              </TabsTrigger>
              <TabsTrigger value="charts">{t("dashboard.charts")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <StatPanel className="mt-4">
            <div className="grid grid-cols-2 lg:grid-cols-4">
              {STAT_BLOCK_SLOTS.map((slot) => (
                <div key={slot} className="flex flex-col px-5 py-4">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-3 h-7 w-20" />
                  <Skeleton className="mt-2 h-3 w-32" />
                </div>
              ))}
            </div>
          </StatPanel>

          <div className="mt-6">
            <Skeleton className="h-6 w-40" />
            <div className="mt-3 flex flex-col gap-4 2xl:flex-row">
              <div className="2xl:flex-1">
                <StatPanel>
                  <div className="flex flex-col lg:flex-row">
                    <div className="border-border flex flex-col items-center justify-center gap-3 px-5 py-5 lg:w-[200px] lg:shrink-0 lg:border-r">
                      <Skeleton className="aspect-square w-full max-w-[160px] rounded-lg" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <div className="grid flex-1 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-3">
                      {HERO_STAT_SLOTS.map((slot) => (
                        <div key={slot} className="flex flex-col px-5 py-4">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="mt-3 h-7 w-20" />
                          <Skeleton className="mt-2 h-3 w-24" />
                        </div>
                      ))}
                    </div>
                  </div>
                </StatPanel>
              </div>
              <div className="2xl:w-[480px] 2xl:shrink-0">
                <div className="ring-foreground/10 max-h-[29.5rem] overflow-hidden rounded-xl ring-1">
                  <Skeleton className="h-[29.5rem] w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DirectionalTransition>
  );
}

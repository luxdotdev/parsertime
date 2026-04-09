import { DirectionalTransition } from "@/components/directional-transition";
import { ScrimCardSkeleton } from "@/components/dashboard/scrim-card-skeleton";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";

export default async function DashboardLoading() {
  const t = await getTranslations("dashboard");

  return (
    <DirectionalTransition>
      <div className="min-h-[90vh] flex-col md:flex">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-balance">
              {t("title")}
            </h2>
          </div>
          <Card className="bg-background">
            {/* Toolbar skeleton */}
            <div className="flex items-center justify-between p-4">
              <span className="inline-flex gap-2">
                <Skeleton className="h-10 w-[180px] rounded-md" />
                <Skeleton className="h-10 w-[260px] rounded-md" />
              </span>
              <Skeleton className="h-10 w-[140px] rounded-md" />
            </div>

            {/* Card grid skeleton */}
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 16 }, (_, i) => (
                <ScrimCardSkeleton key={i} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DirectionalTransition>
  );
}

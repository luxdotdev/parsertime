import { DashboardLayout } from "@/components/dashboard-layout";
import { DirectionalTransition } from "@/components/directional-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";

export default async function ScrimLoading() {
  const t = await getTranslations("scrimPage");

  return (
    <DirectionalTransition>
      <DashboardLayout>
        <div className="flex-1 space-y-6 p-8 pt-6">
          <div>
            <Skeleton className="h-6 w-24" />
            <div className="mt-2 flex items-center justify-between">
              <Skeleton className="h-8 w-48" />
            </div>
            <Skeleton className="mt-2 h-4 w-36" />
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-semibold tracking-tight">
              {t("maps.title")}
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton
                  // oxlint-disable-next-line react/no-array-index-key -- Skeleton elements are not unique
                  key={index}
                  className="aspect-video rounded-xl"
                />
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </DirectionalTransition>
  );
}

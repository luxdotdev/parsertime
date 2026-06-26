import { DashboardLayout } from "@/components/dashboard-layout";
import { DirectionalTransition } from "@/components/directional-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";

export default async function ScrimLoading() {
  const t = await getTranslations("scrimPage");

  return (
    <DirectionalTransition>
      <DashboardLayout>
        <div className="flex-1 px-6 pt-6 pb-12 md:px-8">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-3 h-7 w-56" />
          <Skeleton className="mt-3 h-3.5 w-72" />

          <Skeleton className="mt-8 h-32 w-full rounded-xl" />

          <Skeleton className="mt-6 h-16 w-full rounded-xl" />

          <div className="mt-10">
            <h2 className="text-lg font-semibold tracking-tight">
              {t("maps.title")}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
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

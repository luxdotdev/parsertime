import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";

function MapStatCellSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export async function MapTabsSkeleton() {
  const t = await getTranslations("mapPage.overview");

  return (
    <div className="space-y-5">
      <Skeleton className="h-9 w-96" />
      <section aria-label={t("title")} className="space-y-5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
          <MapStatCellSkeleton />
          <MapStatCellSkeleton />
          <MapStatCellSkeleton />
          <MapStatCellSkeleton />
        </div>
        <Separator />
        <div className="rounded-md border">
          <Skeleton className="h-[70vh] w-full md:h-96" />
        </div>
        <div className="space-y-3 pt-2">
          <Skeleton className="h-6 w-full md:w-1/2" />
          <Skeleton className="h-6 w-full md:w-1/3" />
          <Skeleton className="h-6 w-full md:w-2/5" />
        </div>
      </section>
    </div>
  );
}

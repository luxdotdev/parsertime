import DashboardLayout from "@/components/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";

export default async function ScrimLoading() {
  const t = await getTranslations("scrimPage");

  return (
    <DashboardLayout>
      <div className="min-h-[90vh] flex-col md:flex">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <Skeleton className="h-6 w-24" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-4 w-36" />
          <p className="scroll-m-20 pb-2 text-2xl font-semibold tracking-tight">
            {t("maps.title")}
          </p>
          <div className="-m-2 flex flex-wrap">
            {/* Simulate loading for maps */}
            {Array.from({ length: 6 }).map((_, index) => (
              // eslint-disable-next-line react/no-array-index-key -- Elements are not unique
              <div key={index} className="w-full p-2 md:w-1/3">
                <Card className="h-48 max-w-md">
                  <Skeleton className="h-full w-full" />
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

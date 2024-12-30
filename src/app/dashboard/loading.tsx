import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";

export default async function DashboardLoading() {
  const t = await getTranslations("dashboard");

  return (
    <div className="min-h-[90vh] flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
        </div>
        <Card className="gap-4 p-4">
          <Skeleton className="h-[80vh] w-full md:h-96" />
        </Card>
      </div>
    </div>
  );
}

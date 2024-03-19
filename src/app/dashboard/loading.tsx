import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex-col md:flex min-h-[90vh]">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>
        <Card className="gap-4 p-4">
          <Skeleton className="w-full h-[80vh] md:h-96" />
        </Card>
      </div>
    </div>
  );
}

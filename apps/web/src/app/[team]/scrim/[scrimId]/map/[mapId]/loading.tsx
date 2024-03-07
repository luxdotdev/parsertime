import { Skeleton } from "@lux/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="hidden flex-col md:flex">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <Skeleton className="w-24 h-6" />
          <div className="ml-auto flex items-center space-x-4">
            <Skeleton className="w-24 h-6" />
            <Skeleton className="w-6 h-6" />
            <Skeleton className="w-24 h-6" />S
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>
        <Skeleton className="w-full h-96" />
      </div>
    </div>
  );
}

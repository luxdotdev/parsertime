import { Skeleton } from "@/components/ui/skeleton";

export function SettingsAdminAuditLogsSkeleton() {
  return (
    <main className="py-6">
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="flex flex-col justify-between gap-2 sm:flex-row">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-[200px]" />
            <Skeleton className="h-9 w-[200px]" />
            <Skeleton className="h-9 w-44" />
            <Skeleton className="h-9 w-36" />
          </div>
        </div>
        <div className="rounded-md border">
          <div className="max-h-[75vh] overflow-auto">
            <div className="w-full">
              <div className="border-b px-4 py-3">
                <div className="grid grid-cols-5 gap-4">
                  {["a", "b", "c", "d", "e"].map((k) => (
                    <Skeleton key={k} className="h-4 w-20" />
                  ))}
                </div>
              </div>
              <div>
                {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
                  <div key={k} className="border-b px-4 py-3 last:border-0">
                    <div className="grid grid-cols-5 gap-4">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-5 w-28" />
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
    </main>
  );
}

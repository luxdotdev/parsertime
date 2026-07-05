import { Skeleton } from "@/components/ui/skeleton";

export function SettingsProfileSkeleton() {
  return (
    <div className="space-y-6 lg:max-w-2xl">
      <div className="space-y-1">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="bg-border h-px w-full" />
      <div className="space-y-8">
        {["a", "b", "c"].map((k) => (
          <div key={k} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-3 w-60" />
          </div>
        ))}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-9 rounded-full" />
            <Skeleton className="h-4 w-44" />
          </div>
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="bg-border h-px w-full" />
        <div className="space-y-6">
          <div className="space-y-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <div className="mt-2 space-y-4">
              {["a", "b", "c", "d", "e"].map((k) => (
                <div key={k} className="flex items-start gap-2">
                  <Skeleton className="mt-1 h-4 w-4 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-52" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="max-w-lg rounded-lg border border-red-500 dark:border-red-700">
        <div className="p-6 pb-2">
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="space-y-3 p-6 pt-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
    </div>
  );
}

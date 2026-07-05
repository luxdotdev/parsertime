import { Skeleton } from "@/components/ui/skeleton";

export function SettingsAccountsSkeleton() {
  return (
    <div className="space-y-6 lg:max-w-2xl">
      <div className="space-y-1">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="border-t" />
      <div className="rounded-lg border shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="p-6 pt-0">
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
      <div className="rounded-lg border shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="p-6 pt-0">
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
      <div className="rounded-lg border shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="p-6 pt-0">
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
      </div>
      <div className="rounded-lg border shadow-sm">
        <div className="flex items-start justify-between p-6">
          <div className="flex flex-col space-y-1.5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="space-y-2 p-6 pt-0">
          <div className="grid grid-cols-4 gap-4 border-b pb-3">
            {["a", "b", "c", "d"].map((k) => (
              <Skeleton key={k} className="h-4 w-full" />
            ))}
          </div>
          {["e", "f", "g"].map((k) => (
            <div key={k} className="grid grid-cols-4 gap-4 py-1">
              {["a", "b", "c", "d"].map((j) => (
                <Skeleton key={j} className="h-8 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

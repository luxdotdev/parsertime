import { Skeleton } from "@/components/ui/skeleton";

export function AvailabilityIndexSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      <div className="rounded-lg border shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <Skeleton className="h-5 w-56" />
        </div>
        <div className="space-y-4 p-6 pt-0">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>

      <div className="rounded-lg border shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="p-6 pt-0">
          <ul className="divide-y">
            {["a", "b", "c", "d", "e"].map((k) => (
              <li key={k} className="flex items-center justify-between py-2">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-10" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

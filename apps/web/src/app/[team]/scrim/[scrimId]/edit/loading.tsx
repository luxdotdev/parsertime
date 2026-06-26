import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container py-2">
      <Skeleton className="mb-4 h-4 w-20" />
      <div className="mx-auto max-w-lg px-4">
        <Skeleton className="mb-6 h-7 w-40" />
        <div className="space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full max-w-lg rounded-md" />
            <Skeleton className="h-3 w-64" />
          </div>
          <div className="max-w-lg space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full max-w-lg rounded-md" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex flex-row items-start space-x-3">
            <Skeleton className="h-5 w-10 shrink-0 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-72 max-w-full" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            {["a", "b", "c"].map((k) => (
              <Skeleton key={k} className="h-10 w-full max-w-lg rounded-md" />
            ))}
          </div>
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
        <div className="p-4" />
        <div className="max-w-lg space-y-3 rounded-lg border border-red-500 p-6 dark:border-red-700">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-64" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
    </div>
  );
}

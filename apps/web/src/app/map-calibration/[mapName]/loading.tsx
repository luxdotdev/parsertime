import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col px-4 pt-4 pb-4 sm:px-6">
      <div className="flex h-[calc(100vh-5rem)] flex-col gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-7 w-48" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 gap-4">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-full w-full rounded-lg" />
          </div>

          <div className="flex w-80 shrink-0 flex-col gap-4">
            <div className="rounded-lg border p-3">
              <Skeleton className="mb-2 h-4 w-28" />
              {["a", "b", "c", "d"].map((k) => (
                <Skeleton key={k} className="mb-1.5 h-9 w-full rounded-md" />
              ))}
            </div>

            <div className="flex gap-2">
              <Skeleton className="h-8 flex-1 rounded-md" />
            </div>

            <Skeleton className="h-24 w-full rounded-md" />

            <Skeleton className="h-20 w-full rounded-md" />
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>

        <div className="flex w-80 shrink-0 flex-col gap-3">
          <Skeleton className="h-8 w-full rounded-md" />
          {["a", "b", "c"].map((k) => (
            <div key={k} className="space-y-2 rounded-lg border p-3">
              <Skeleton className="h-8 w-full rounded-md" />
              <div className="flex gap-1.5">
                {["x", "y", "z"].map((j) => (
                  <Skeleton key={j} className="h-5 w-16 rounded-full" />
                ))}
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 flex-1 rounded-md" />
                <Skeleton className="h-8 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

const FOUR = ["a", "b", "c", "d"];
const SIX = ["a", "b", "c", "d", "e", "f"];

export default function Loading() {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3.5 w-64 max-w-full" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-9 rounded-full" />
            <Skeleton className="h-4 w-14" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3.5 w-60 max-w-full" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-5 w-9 rounded-full" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
          <div className="grid gap-4 p-6 lg:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-1">
          {SIX.map((k) => (
            <Skeleton key={k} className="h-9 w-24 rounded-md" />
          ))}
        </div>
        <div className="space-y-4 pt-2">
          <div className="grid gap-4 sm:grid-cols-2">
            {FOUR.map((k) => (
              <div key={k} className="rounded-xl border p-4">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

const SIX = ["a", "b", "c", "d", "e", "f"];

export default function Loading() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Skeleton className="h-9 w-36" />

      <div className="rounded-xl border">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3.5 w-72 max-w-full" />
          </div>
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
          {SIX.map((k) => (
            <div key={k} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-2 pb-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="size-8 shrink-0 rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-4/5" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

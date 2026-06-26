import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <Skeleton className="h-2.5 w-28" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="flex justify-end">
            <Skeleton className="h-9 w-56 rounded-xl" />
          </div>

          <div className="space-y-2 pr-12">
            {["a", "b", "c"].map((k) => (
              <Skeleton key={k} className="h-4 w-full" />
            ))}
            <Skeleton className="h-4 w-4/5" />
          </div>

          <div className="flex justify-end">
            <Skeleton className="h-9 w-72 rounded-xl" />
          </div>

          <div className="space-y-2 pr-12">
            {["d", "e"].map((k) => (
              <Skeleton key={k} className="h-4 w-full" />
            ))}
            <Skeleton className="h-4 w-3/5" />
          </div>

          <div className="flex justify-end">
            <Skeleton className="h-9 w-44 rounded-xl" />
          </div>

          <div className="space-y-2 pr-12">
            {["f", "g", "h", "i"].map((k) => (
              <Skeleton key={k} className="h-4 w-full" />
            ))}
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>

      <div className="border-t px-4 py-3">
        <Skeleton className="mx-auto h-11 w-full max-w-3xl rounded-lg" />
      </div>
    </div>
  );
}

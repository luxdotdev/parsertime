import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex items-center gap-4">
        <Skeleton className="size-5 rounded" />
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_2fr_1fr]">
        <div className="flex items-center justify-center rounded-lg border p-4">
          <div className="flex flex-col items-center gap-2 py-4">
            <Skeleton className="size-12 rounded-full" />
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-12 w-10" />
          </div>
        </div>

        <div className="space-y-4">
          <Skeleton className="mx-auto h-3.5 w-10" />
          <div className="space-y-3">
            {["a", "b", "c"].map((k) => (
              <div key={k} className="rounded-lg border px-4 py-3">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center rounded-lg border p-4">
          <div className="flex flex-col items-center gap-2 py-4">
            <Skeleton className="size-12 rounded-full" />
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-12 w-10" />
          </div>
        </div>
      </div>
    </div>
  );
}

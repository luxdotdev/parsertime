import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {["a", "b", "c", "d", "e", "f"].map((k) => (
          <div key={k} className="border-border rounded-xl border">
            <div className="flex flex-col space-y-1.5 p-6 pb-2">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-5 w-16 shrink-0" />
              </div>
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="p-6 pt-0">
              <div className="space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

const ROWS = ["a", "b", "c", "d", "e"];

export default function Loading() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="space-y-1.5">
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </div>
      <section className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-full rounded-md" />
          <div className="border-input divide-input divide-y overflow-hidden rounded-md border">
            {ROWS.map((k) => (
              <div key={k} className="flex items-center gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-6 w-6 shrink-0 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

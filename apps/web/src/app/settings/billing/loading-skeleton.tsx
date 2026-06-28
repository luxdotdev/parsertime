import { Skeleton } from "@/components/ui/skeleton";

export function SettingsBillingSkeleton() {
  return (
    <section>
      <div>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>
      <div className="my-6 border-t" />
      <div className="space-y-6">
        <div className="flex w-full items-center justify-center p-10">
          <div className="w-full">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
            <dl className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {["a", "b", "c"].map((k) => (
                <div key={k} className="rounded-lg border p-4">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <div className="rounded-lg border">
          <div className="flex flex-row items-start justify-between gap-4 p-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
          <div className="space-y-4 p-6 pt-0">
            <div className="flex items-baseline gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-7 w-24" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-4 w-28" />
              {["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map((k) => (
                <div
                  key={k}
                  className="flex items-center justify-between border-b py-1.5 last:border-b-0"
                >
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

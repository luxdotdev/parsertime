import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col px-6 pt-6 sm:px-10">
      <header className="border-border border-b pb-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-6 w-48" />
        <Skeleton className="mt-2 h-4 w-80" />
      </header>
      <div className="flex-1 py-4">
        <div className="flex h-[calc(100vh-14rem)] flex-col gap-3 overflow-hidden">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-[280px] rounded-md" />
            <div className="flex items-center gap-1">
              {["a", "b", "c", "d", "e"].map((k) => (
                <Skeleton key={k} className="h-8 w-8 rounded-md" />
              ))}
            </div>
            <div className="bg-border h-6 w-px" />
            <div className="flex items-center gap-1">
              {["f", "g", "h", "i", "j"].map((k) => (
                <Skeleton key={k} className="h-5 w-5 rounded-full" />
              ))}
            </div>
            <div className="bg-border h-6 w-px" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-2 w-20 rounded-full" />
              <Skeleton className="h-4 w-4" />
            </div>
            <div className="bg-border h-6 w-px" />
            {["k", "l", "m"].map((k) => (
              <Skeleton key={k} className="h-8 w-8 rounded-md" />
            ))}
          </div>
          <div className="border-border bg-card flex flex-1 overflow-hidden rounded-xl border">
            <div className="border-border w-1/5 min-w-[9rem] border-r">
              <div className="border-border mx-2 mt-2 flex gap-5 border-b pb-2.5">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-14" />
              </div>
              <div className="space-y-3 p-2 pt-3">
                <div>
                  <Skeleton className="mb-1.5 h-2.5 w-8" />
                  <div className="grid grid-cols-4 gap-1">
                    {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
                      <div
                        key={k}
                        className="flex flex-col items-center gap-0.5 p-1"
                      >
                        <Skeleton className="size-9 rounded-full" />
                        <Skeleton className="h-2 w-6" />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Skeleton className="mb-1.5 h-2.5 w-12" />
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      "a",
                      "b",
                      "c",
                      "d",
                      "e",
                      "f",
                      "g",
                      "h",
                      "i",
                      "j",
                      "k",
                      "l",
                      "m",
                      "n",
                      "o",
                      "p",
                    ].map((k) => (
                      <div
                        key={k}
                        className="flex flex-col items-center gap-0.5 p-1"
                      >
                        <Skeleton className="size-9 rounded-full" />
                        <Skeleton className="h-2 w-6" />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Skeleton className="mb-1.5 h-2.5 w-10" />
                  <div className="grid grid-cols-4 gap-1">
                    {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
                      <div
                        key={k}
                        className="flex flex-col items-center gap-0.5 p-1"
                      >
                        <Skeleton className="size-9 rounded-full" />
                        <Skeleton className="h-2 w-6" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 p-2">
              <Skeleton className="h-full w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

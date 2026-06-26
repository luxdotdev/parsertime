import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-0 flex-1">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>

        <div className="flex flex-1 items-center justify-center overflow-hidden">
          <div className="flex w-full max-w-lg flex-col items-start gap-6 px-4 text-left">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
            <div className="w-full space-y-1.5">
              <Skeleton className="mb-2 h-3 w-16" />
              {["a", "b", "c", "d"].map((k) => (
                <div
                  key={k}
                  className="border-border flex w-full items-center gap-3 rounded-md border px-3 py-2.5"
                >
                  <Skeleton className="h-3 w-4 shrink-0" />
                  <Skeleton className="h-3 flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t px-4 py-3">
          <div className="border-input mx-auto flex max-w-3xl items-end gap-2 rounded-lg border py-2 pr-2 pl-3 shadow-xs">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="size-7 shrink-0 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

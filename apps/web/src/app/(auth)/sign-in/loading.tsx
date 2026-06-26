import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2 self-center">
          <Skeleton className="size-6 rounded-md" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="bg-card rounded-xl border shadow">
          <div className="flex flex-col items-center gap-2 p-6 pb-0 text-center">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="p-6">
            <div className="grid gap-6">
              <div className="flex flex-col gap-4">
                {["discord", "google", "github"].map((k) => (
                  <Skeleton key={k} className="h-9 w-full rounded-md" />
                ))}
              </div>
              <div className="relative">
                <Skeleton className="h-px w-full" />
              </div>
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="mx-auto h-4 w-48" />
              </div>
            </div>
          </div>
        </div>
        <Skeleton className="mx-auto h-3 w-64" />
      </div>
    </div>
  );
}

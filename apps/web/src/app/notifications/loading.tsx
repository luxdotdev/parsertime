import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center gap-4">
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-sm" />
          <Skeleton className="h-7 w-36" />
        </div>
        <Skeleton className="ml-auto h-8 w-32 rounded-md" />
      </div>

      <div className="border-border rounded-lg border">
        <div className="p-6">
          <Skeleton className="h-5 w-44" />
        </div>
        <div className="border-border divide-border divide-y border-t">
          {["a", "b", "c", "d", "e", "f"].map((k) => (
            <div key={k} className="p-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3.5 w-80 max-w-full" />
                  </div>
                </div>
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

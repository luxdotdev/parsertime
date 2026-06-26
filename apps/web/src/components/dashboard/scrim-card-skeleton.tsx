import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ScrimCardSkeleton() {
  return (
    <Card data-size="sm" className="relative max-w-md gap-3 overflow-hidden">
      <CardHeader className="space-y-2 pb-2">
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 shrink-0 rounded-sm" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 shrink-0 rounded-sm" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-9" />
          <Skeleton className="size-5 shrink-0 rounded-full" />
          <Skeleton className="h-4 w-28" />
        </div>
      </CardContent>
    </Card>
  );
}

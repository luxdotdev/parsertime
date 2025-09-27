import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ScrimCardSkeleton() {
  return (
    <Card className="bg-background hover:bg-muted/50 relative max-w-md transition-colors sm:h-48 md:h-64 xl:h-48">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-24 pt-10" />
      </CardContent>
    </Card>
  );
}

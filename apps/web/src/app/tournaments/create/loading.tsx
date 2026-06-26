import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <Skeleton className="h-9 w-52" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-9 w-40" />
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-[90vh] flex-col items-center justify-center space-y-6 p-6">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-4 w-96 max-w-[600px]" />
      <Skeleton className="h-10 w-32 rounded-md" />
    </div>
  );
}

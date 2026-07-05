import { Skeleton } from "@/components/ui/skeleton";

export function SettingsAdminImpersonateUserSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-px w-full" />
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

// Generic content-area skeleton for pages whose request data now streams in
// behind a <Suspense> boundary. Use as the Suspense fallback for routes that
// don't have a more specific loading.tsx skeleton to reuse, so the content
// region shows a skeleton instead of dropping to a blank while data loads.
export function PageContentSkeleton() {
  return (
    <div className="flex-1 space-y-4 px-6 pt-6 pb-12 md:px-8">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <Skeleton className="mt-4 h-72 w-full rounded-xl" />
    </div>
  );
}

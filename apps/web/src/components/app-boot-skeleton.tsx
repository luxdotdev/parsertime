import { Skeleton } from "@/components/ui/skeleton";

// Root Suspense fallback. The provider tree (locale, auth, feature flags)
// streams in on every full page load, so without this a hard reload paints a
// blank document until those reads resolve. This mirrors the app chrome — a
// header bar plus a neutral content area — so a reload shows the app loading
// instead of a white void, then the route's own loading.tsx takes over.
export function AppBootSkeleton() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border flex h-14 items-center gap-3 border-b px-4 sm:px-6">
        <Skeleton className="h-7 w-7 rounded-md" />
        <Skeleton className="hidden h-4 w-28 sm:block" />
        <nav className="ml-6 hidden items-center gap-5 md:flex">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-16" />
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Skeleton className="h-7 w-16 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-6 px-6 pt-10 pb-16 sm:px-10">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </main>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

// Fallback for the auth-derived app header while it streams: mirrors the real
// header's dimensions (logo, nav links, right-side utilities) so the chrome
// doesn't jump from an empty bar to a populated one.
export function HeaderSkeleton() {
  return (
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
  );
}

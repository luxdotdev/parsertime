import { Skeleton } from "@/components/ui/skeleton";

// Fallback for the auth-derived top bar while it streams: mirrors the slim
// header's dimensions (sidebar trigger, switcher, right-side utilities) so
// the chrome doesn't jump from an empty bar to a populated one.
export function HeaderSkeleton() {
  return (
    <header className="border-border flex h-14 items-center gap-2 border-b px-4">
      <Skeleton className="size-7 rounded-md" />
      <Skeleton className="h-8 w-40 rounded-md" />
      <div className="ml-auto flex items-center gap-2">
        <Skeleton className="hidden h-9 w-9 rounded-lg sm:block xl:w-40" />
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="size-8 rounded-full" />
      </div>
    </header>
  );
}

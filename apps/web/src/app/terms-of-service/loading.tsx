import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="bg-white px-6 py-32 lg:px-8 dark:bg-black">
      <div className="mx-auto max-w-3xl">
        <Skeleton className="h-10 w-72 sm:w-96" />
        <div className="mt-6 space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
        </div>

        <Skeleton className="mt-16 h-7 w-56" />
        <div className="mt-6 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>

        <Skeleton className="mt-16 h-7 w-48" />
        <div className="mt-6 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="mt-8 space-y-2 pl-8">
          {["a", "b", "c"].map((k) => (
            <Skeleton key={k} className="h-4 w-3/4" />
          ))}
        </div>

        <Skeleton className="mt-16 h-7 w-52" />
        <div className="mt-6 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="mt-8 space-y-2 pl-8">
          {["a", "b", "c", "d"].map((k) => (
            <Skeleton key={k} className="h-4 w-3/4" />
          ))}
        </div>

        <Skeleton className="mt-16 h-7 w-44" />
        <div className="mt-6 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/5" />
        </div>
        <div className="mt-8 space-y-2 pl-8">
          {["a", "b", "c"].map((k) => (
            <Skeleton key={k} className="h-4 w-3/4" />
          ))}
        </div>

        <Skeleton className="mt-16 h-7 w-56" />
        <div className="mt-6 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="mt-8 space-y-2 pl-8">
          {["a", "b", "c", "d", "e", "f"].map((k) => (
            <Skeleton key={k} className="h-4 w-3/4" />
          ))}
        </div>

        <Skeleton className="mt-16 h-7 w-52" />
        <div className="mt-6 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/5" />
        </div>
        <div className="mt-8 space-y-2 pl-8">
          {["a", "b", "c"].map((k) => (
            <Skeleton key={k} className="h-4 w-3/4" />
          ))}
        </div>

        <Skeleton className="mt-16 h-7 w-40" />
        <div className="mt-6 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>

        <Skeleton className="mt-16 h-7 w-64" />
        <div className="mt-6 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        <Skeleton className="mt-16 h-7 w-36" />
        <div className="mt-6 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        <Skeleton className="mt-16 h-7 w-44" />
        <div className="mt-6 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/5" />
        </div>

        <Skeleton className="mt-16 h-7 w-52" />
        <div className="mt-6 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>

        <Skeleton className="mt-16 h-7 w-36" />
        <div className="mt-6 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}

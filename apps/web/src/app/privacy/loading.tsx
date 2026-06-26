import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="bg-white px-6 py-32 lg:px-8 dark:bg-black">
      <div className="mx-auto max-w-3xl">
        <Skeleton className="mt-2 h-9 w-64" />
        <div className="mt-6 space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
        </div>

        <Skeleton className="mt-16 h-7 w-56" />
        <div className="mt-6 max-w-2xl space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <ul className="mt-8 max-w-xl space-y-8">
          {["a", "b", "c"].map((k) => (
            <li key={k} className="flex gap-x-3">
              <Skeleton className="mt-1 h-5 w-5 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </li>
          ))}
        </ul>

        <Skeleton className="mt-16 h-7 w-48" />
        <div className="mt-6 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <ul className="mt-8 max-w-xl space-y-2 pl-8">
          {["a", "b", "c", "d"].map((k) => (
            <li key={k}>
              <Skeleton className="h-4 w-full" />
            </li>
          ))}
        </ul>

        {["a", "b", "c", "d"].map((k) => (
          <div key={k}>
            <Skeleton className="mt-16 h-7 w-52" />
            <div className="mt-6 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

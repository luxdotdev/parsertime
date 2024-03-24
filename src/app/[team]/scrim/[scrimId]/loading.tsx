import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScrimLoading() {
  return (
    <div className="min-h-[90vh] flex-col md:flex">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <div className="ml-auto flex items-center space-x-4">
            {/* Placeholder for Search, ModeToggle, UserNav */}
            <Skeleton className="hidden h-9 w-full rounded-md border border-input px-3 py-1 md:flex md:w-[100px] lg:w-[300px]" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Skeleton className="h-6 w-24" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-4 w-36" />
        <p className="scroll-m-20 pb-2 text-2xl font-semibold tracking-tight">
          Maps
        </p>
        <div className="-m-2 flex flex-wrap">
          {/* Simulate loading for maps */}
          {Array.from({ length: 6 }).map((_, index) => (
            // eslint-disable-next-line react/no-array-index-key -- Elements are not unique
            <div key={index} className="w-full p-2 md:w-1/3">
              <Card className="h-48 max-w-md">
                <Skeleton className="h-full w-full" />
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

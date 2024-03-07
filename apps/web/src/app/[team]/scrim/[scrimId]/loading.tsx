import { Card } from "@lux/ui/card";
import { Skeleton } from "@lux/ui/skeleton";

export default function ScrimLoading() {
  return (
    <div className="hidden flex-col md:flex min-h-[90vh]">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <div className="ml-auto flex items-center space-x-4">
            {/* Placeholder for Search, ModeToggle, UserNav */}
            <Skeleton className="md:w-[100px] lg:w-[300px] flex h-9 w-full rounded-md border border-input px-3 py-1" />
            <Skeleton className="w-9 h-9" />
            <Skeleton className="w-8 h-8 rounded-full" />
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Skeleton className="w-24 h-6" />
        <div className="flex items-center justify-between">
          <Skeleton className="w-48 h-8" />
        </div>
        <Skeleton className="w-36 h-4" />
        <p className="scroll-m-20 text-2xl font-semibold tracking-tight pb-2">
          Maps
        </p>
        <div className="flex flex-wrap -m-2">
          {/* Simulate loading for maps */}
          {Array.from({ length: 6 }).map((_, index) => (
            // eslint-disable-next-line react/no-array-index-key -- Elements are not unique
            <div key={index} className="p-2 w-1/3">
              <Card className="max-w-md h-48">
                <Skeleton className="w-full h-full" />
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

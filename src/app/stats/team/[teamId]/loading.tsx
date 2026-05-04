/* oxlint-disable react/no-array-index-key */
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tabTriggerClass =
  "text-muted-foreground hover:text-foreground data-[state=active]:text-foreground border-0 border-b-2 border-b-transparent data-[state=active]:border-b-primary rounded-none bg-transparent px-0 pb-3 pt-1 font-mono text-[11px] tracking-[0.16em] uppercase shadow-none data-[state=active]:shadow-none data-[state=active]:bg-transparent dark:bg-transparent dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-primary transition-colors";

export default function TeamStatsLoading() {
  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b pb-6">
        <div className="flex items-end gap-4">
          <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
          <div>
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-3 h-9 w-64" />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <div className="flex items-baseline gap-x-8">
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="h-6 w-16" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-14" />
              <Skeleton className="h-6 w-12" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="h-6 w-10" />
            </div>
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
      </header>

      <Tabs defaultValue="overview" className="mt-6 space-y-8">
        <TabsList className="border-border h-auto w-full justify-start gap-6 rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="overview" className={tabTriggerClass}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="performance" className={tabTriggerClass}>
            Performance
          </TabsTrigger>
          <TabsTrigger value="heroes" className={tabTriggerClass}>
            Heroes
          </TabsTrigger>
          <TabsTrigger value="trends" className={tabTriggerClass}>
            Trends
          </TabsTrigger>
          <TabsTrigger value="maps" className={tabTriggerClass}>
            Maps
          </TabsTrigger>
          <TabsTrigger value="teamfights" className={tabTriggerClass}>
            Teamfights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-12">
          <div className="border-border grid grid-cols-2 divide-x divide-y divide-[var(--border)] border-y sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2 px-4 py-3">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>

          <section className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-44" />
              <Skeleton className="h-6 w-64" />
            </div>
            <div className="grid gap-x-10 gap-y-8 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-2.5 w-20" />
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-5">
                <Skeleton className="h-[260px] w-full" />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-44" />
              <Skeleton className="h-6 w-48" />
            </div>
            <div className="border-border overflow-hidden rounded-md border">
              <Skeleton className="h-9 w-full rounded-none" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 border-t border-[var(--border)] px-4 py-3"
                >
                  <Skeleton className="h-9 w-9 rounded" />
                  <Skeleton className="h-4 w-32" />
                  <div className="ml-auto flex items-center gap-6">
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-1.5 w-32 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-32" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-1.5">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="performance" className="space-y-12">
          <SkeletonRibbon />
          <SkeletonTable rows={10} />
          <SkeletonTable rows={5} />
        </TabsContent>

        <TabsContent value="heroes" className="space-y-12">
          <SkeletonRibbon />
          <SkeletonSection bodyHeight={200} />
          <SkeletonSection bodyHeight={420} />
          <SkeletonTable rows={8} />
          <SkeletonTable rows={8} />
        </TabsContent>

        <TabsContent value="trends" className="space-y-12">
          <SkeletonRibbon />
          <SkeletonSection bodyHeight={300} />
          <SkeletonTable rows={5} />
        </TabsContent>

        <TabsContent value="maps" className="space-y-12">
          <SkeletonRibbon />
          <SkeletonSection bodyHeight={300} />
          <SkeletonSection bodyHeight={400} />
        </TabsContent>

        <TabsContent value="swaps" className="space-y-12">
          <SkeletonRibbon />
          <SkeletonSection bodyHeight={280} />
          <SkeletonTable rows={6} />
        </TabsContent>

        <TabsContent value="teamfights" className="space-y-12">
          <SkeletonRibbon />
          <SkeletonSection bodyHeight={260} />
          <SkeletonTable rows={6} />
        </TabsContent>

        <TabsContent value="ultimates" className="space-y-12">
          <SkeletonRibbon />
          <SkeletonSection bodyHeight={260} />
          <SkeletonTable rows={8} />
        </TabsContent>

        <TabsContent value="winrates" className="space-y-12">
          <SkeletonRibbon />
          <SkeletonSection bodyHeight={300} />
          <SkeletonTable rows={5} />
        </TabsContent>

        <TabsContent value="simulator" className="space-y-12">
          <SkeletonRibbon />
          <SkeletonSection bodyHeight={420} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SkeletonRibbon() {
  return (
    <div className="border-border grid grid-cols-2 divide-x divide-y divide-[var(--border)] border-y sm:grid-cols-2 lg:grid-cols-4 lg:divide-y-0">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2 px-4 py-3">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

function SkeletonSection({ bodyHeight }: { bodyHeight: number }) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-2.5 w-44" />
        <Skeleton className="h-6 w-56" />
      </div>
      <Skeleton className="w-full" style={{ height: bodyHeight }} />
    </section>
  );
}

function SkeletonTable({ rows }: { rows: number }) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-2.5 w-44" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="border-border overflow-hidden rounded-md border">
        <Skeleton className="h-9 w-full rounded-none" />
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-t border-[var(--border)] px-4 py-3"
          >
            <Skeleton className="h-9 w-9 rounded" />
            <Skeleton className="h-4 w-32" />
            <div className="ml-auto flex items-center gap-6">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-1.5 w-32 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

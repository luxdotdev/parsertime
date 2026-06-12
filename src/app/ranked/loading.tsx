/* oxlint-disable react/no-array-index-key */
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tabTriggerClass =
  "text-muted-foreground hover:text-foreground data-[state=active]:text-foreground border-0 border-b-2 border-b-transparent data-[state=active]:border-b-primary rounded-none bg-transparent px-0 pb-3 pt-1 font-mono text-[11px] tracking-[0.16em] uppercase shadow-none data-[state=active]:shadow-none data-[state=active]:bg-transparent dark:bg-transparent dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-primary transition-colors";

const TAB_LABELS = [
  "Overview",
  "Heroes",
  "Maps",
  "Time",
  "Patches",
  "Groups",
  "Roles",
];

export default function RankedLoading() {
  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border border-b pb-6">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="mt-3 h-9 w-56" />
      </header>

      <div className="mt-6 space-y-8">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>

        <div className="border-border grid grid-cols-2 divide-x divide-y divide-[var(--border)] border-y sm:grid-cols-2 lg:grid-cols-4 lg:divide-y-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 px-4 py-3">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>

        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="border-border h-auto w-full justify-start gap-6 overflow-x-auto rounded-none border-b bg-transparent p-0">
            {TAB_LABELS.map((label) => (
              <TabsTrigger
                key={label}
                value={label.toLowerCase()}
                className={tabTriggerClass}
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <SkeletonSection bodyHeight={350} />
            <div className="grid gap-4 md:grid-cols-2">
              <SkeletonSection bodyHeight={250} />
              <SkeletonSection bodyHeight={250} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SkeletonSection({ bodyHeight }: { bodyHeight: number }) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-2.5 w-32" />
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-3.5 w-72" />
      </div>
      <Skeleton className="w-full" style={{ height: bodyHeight }} />
    </section>
  );
}

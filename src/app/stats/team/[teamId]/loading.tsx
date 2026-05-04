/* oxlint-disable react/no-array-index-key */
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Team Roster + Recent Activity Grid Skeleton */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Team Roster Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Calendar Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[200px] w-full" />
              </CardContent>
            </Card>
          </div>

          {/* Top Maps + Strengths/Weaknesses Grid Skeleton */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Top Maps Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Strengths/Weaknesses Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-20" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-24" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Role Balance Radar Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-36" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <Skeleton className="h-[400px] w-full max-w-2xl" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other Tabs Skeleton (shown when switching tabs during loading) */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heroes" className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[400px] w-full" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maps" className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-36" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[400px] w-full" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teamfights" className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-44" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

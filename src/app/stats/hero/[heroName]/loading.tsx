import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatsLoading() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <Skeleton className="h-9 w-[220px]" />
      </div>

      <main className="space-y-2">
        <div className="items-center gap-2 space-y-2 md:flex md:space-y-0">
          <Skeleton className="h-9 w-[180px]" />
        </div>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>Hero Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72" />
            </CardContent>
          </Card>
          <Card className="col-span-1 md:col-span-2 xl:col-span-1">
            <CardHeader>
              <CardTitle>Best Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72" />
            </CardContent>
          </Card>
          <Card className="col-span-1 md:col-span-2 xl:col-span-1">
            <CardHeader>
              <CardTitle>Final Blows By Method</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72" />
            </CardContent>
          </Card>
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-1">
                Average Hero Damage Dealt per 10 (per scrim)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72" />
            </CardContent>
          </Card>
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-1">
                Average Deaths per 10 (per scrim)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72" />
            </CardContent>
          </Card>
          <Card className="col-span-1 md:col-span-2 xl:col-span-1">
            <CardHeader>
              <CardTitle>Heroes Died To Most</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72" />
            </CardContent>
          </Card>
          <Card className="col-span-1 md:col-span-2 xl:col-span-1">
            <CardHeader>
              <CardTitle>Heroes Eliminated Most</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72" />
            </CardContent>
          </Card>
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor="stat">Stat</Label>
                  <Skeleton className="h-6 w-[180px]" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72" />
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

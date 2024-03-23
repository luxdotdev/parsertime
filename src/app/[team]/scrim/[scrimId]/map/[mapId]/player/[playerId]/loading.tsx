import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import CardIcon from "@/components/ui/card-icon";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlayerDashboardLoading() {
  return (
    <div className="flex-col md:flex">
      <div className="border-b">
        <div className="hidden md:flex h-16 items-center px-4">
          <Skeleton className="w-24 h-6" />
          <div className="ml-auto flex items-center space-x-4">
            <Skeleton className="hidden md:w-[100px] lg:w-[300px] md:flex h-9 w-full rounded-md border border-input px-3 py-1" />
            <Skeleton className="w-9 h-9" />
            <Skeleton className="w-8 h-8 rounded-full" />
          </div>
        </div>
        <div className="flex md:hidden h-16 items-center px-4">
          <Skeleton className="w-24 h-6" />
          <div className="ml-auto flex items-center space-x-4">
            <Skeleton className="w-9 h-9" />
            <Skeleton className="w-8 h-8 rounded-full" />
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div>
          <h4 className="text-gray-600 dark:text-gray-400">
            <Skeleton className="w-48 h-6" />
          </h4>
        </div>
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            <Skeleton className="w-40 h-10" />
          </h2>
        </div>
        <div className="space-y-4">
          <Skeleton className="w-32 h-8" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Match Time
              </CardTitle>
              <CardIcon>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </CardIcon>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <Skeleton className="w-24 h-6" />
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="w-32 h-4" />
            </CardFooter>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium align-baseline">
                Fleta Deadlift Percentage
              </CardTitle>
              <CardIcon>
                <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15" />
                <path d="M11 12 5.12 2.2" />
                <path d="m13 12 5.88-9.8" />
                <path d="M8 7h8" />
                <circle cx="12" cy="17" r="5" />
                <path d="M12 18v-2h-.5" />
              </CardIcon>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <Skeleton className="w-24 h-6" />
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="w-full h-8" />
            </CardFooter>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                First Pick Percentage
              </CardTitle>
              <CardIcon>
                <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
                <line x1="13" x2="19" y1="19" y2="13" />
                <line x1="16" x2="20" y1="16" y2="20" />
                <line x1="19" x2="21" y1="21" y2="19" />
              </CardIcon>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <Skeleton className="w-24 h-6" />
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="w-full h-8" />
            </CardFooter>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                First Death Percentage
              </CardTitle>
              <CardIcon>
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </CardIcon>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <Skeleton className="w-24 h-6" />
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="w-full h-8" />
            </CardFooter>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle>Player Statistics</CardTitle>
            </CardHeader>
            <CardContent className="pl-4">
              <main>
                <h1 className="scroll-m-20 pb-2 pl-2 text-3xl font-semibold tracking-tight first:mt-0">
                  <Skeleton className="w-32 h-10" />
                </h1>
                <div className="flex flex-1">
                  <div className="p-2 w-full lg:w-1/2">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <Card>
                        <Skeleton className="w-full h-56" />
                      </Card>
                      <Card>
                        <Skeleton className="w-full h-56" />
                      </Card>
                      <Card>
                        <Skeleton className="w-full h-56" />
                      </Card>
                      <Card>
                        <Skeleton className="w-full h-56" />
                      </Card>
                      <Card>
                        <Skeleton className="w-full h-56" />
                      </Card>
                      <Card>
                        <Skeleton className="w-full h-56" />
                      </Card>
                      <Card>
                        <Skeleton className="w-full h-56" />
                      </Card>
                      <Card>
                        <Skeleton className="w-full h-56" />
                      </Card>
                    </div>
                  </div>
                  <div className="w-1/2 p-2 hidden md:grid">
                    <div className="space-y-4">
                      <div className="rounded-xl border max-h-[29.5rem]">
                        <Skeleton className="w-full h-[29.5rem]" />
                      </div>
                    </div>
                  </div>
                </div>
              </main>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { AddMapCard } from "@/components/map/add-map";
import { Search } from "@/components/map/search";
import { ModeToggle } from "@/components/theme-switcher";
import { Card, CardHeader } from "@/components/ui/card";
import { UserNav } from "@/components/user-nav";
import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function ScrimDashboardPage({
  params,
  searchParams,
}: {
  params: { team: string; scrimId: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const id = parseInt(params.scrimId);

  const maps = await prisma.map.findMany({
    where: {
      scrimId: id,
    },
  });

  return (
    <>
      <div className="hidden flex-col md:flex">
        <div className="border-b">
          <div className="flex h-16 items-center px-4">
            <div className="ml-auto flex items-center space-x-4">
              <Search />
              <ModeToggle />
              <UserNav />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          </div>
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight pb-2">
            Maps
          </h3>
          {maps.length > 0 ? (
            maps.map((map) => (
              <>
                <Card className="max-w-md h-28">
                  <Link
                    key={map.id}
                    href={`/${params.team}/scrim/${params.scrimId}/map/${map.id}`}
                  >
                    <CardHeader>
                      <h3 className="text-2xl font-semibold tracking-tight">
                        {map.name}
                      </h3>
                    </CardHeader>
                    <div className="flex flex-col items-center justify-center space-y-2 h-[36rem]"></div>
                  </Link>
                </Card>
                <div className="pb-1" />
              </>
            ))
          ) : (
            <Card>
              <CardHeader>
                <h3 className="text-2xl font-semibold tracking-tight">
                  No Maps
                </h3>
              </CardHeader>
              <div className="flex flex-col items-center justify-center space-y-2 h-[36rem]">
                <p className="text-gray-500">
                  No maps have been created for this scrim.
                </p>
              </div>
            </Card>
          )}
          <AddMapCard />
        </div>
      </div>
    </>
  );
}

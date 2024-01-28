import { AddMapCard } from "@/components/map/add-map";
import { Search } from "@/components/map/search";
import { ModeToggle } from "@/components/theme-switcher";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { UserNav } from "@/components/user-nav";
import prisma from "@/lib/prisma";
import { toKebabCase } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

export default async function ScrimDashboardPage({
  params,
  searchParams,
}: {
  params: { team: string; scrimId: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const id = parseInt(params.scrimId);

  const scrim = await prisma.scrim.findFirst({
    where: {
      id: id,
    },
  });

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
          <h4 className="text-gray-600 dark:text-gray-400">
            <Link href={`/dashboard`}>&larr; Back to dashboard</Link>
          </h4>
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
              {scrim?.name ?? "New Scrim"}
            </h2>
          </div>
          <h4 className="scroll-m-20 text-xl font-semibold tracking-tight pb-4">
            {scrim?.date.toDateString() ?? "No Date"}
          </h4>
          <p className="scroll-m-20 text-2xl font-semibold tracking-tight pb-2">
            Maps
          </p>
          {maps.length > 0 ? (
            <div className="flex flex-wrap -m-2">
              {maps.map((map) => (
                <div key={map.id} className="p-2 w-1/3">
                  <Card className="max-w-md h-48 bg-cover relative">
                    <Link
                      href={`/${params.team}/scrim/${params.scrimId}/map/${map.id}`}
                    >
                      <CardHeader>
                        <h3 className="text-3xl font-semibold tracking-tight z-10 text-stroke dark:dark-text-stroke">
                          {map.name}
                        </h3>
                      </CardHeader>
                      <CardContent>
                        <Image
                          src={`/maps/${toKebabCase(map.name)}.webp`}
                          alt={map.name}
                          layout="fill"
                          objectFit="cover"
                          className="rounded-md"
                        />
                      </CardContent>
                    </Link>
                  </Card>
                </div>
              ))}
              <AddMapCard />
            </div>
          ) : (
            <AddMapCard />
          )}
        </div>
      </div>
    </>
  );
}

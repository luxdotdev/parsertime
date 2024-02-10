import { Card, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Teams | Parsertime",
  description: "Parsertime is a tool for analyzing Overwatch scrims.",
  openGraph: {
    title: `Teams | Parsertime`,
    description: `Parsertime is a tool for analyzing Overwatch scrims.`,
    url: "https://parsertime.app",
    type: "website",
    siteName: "Parsertime",
    images: [
      {
        url: `https://parsertime.app/api/og?title=Teams`,
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
  },
};

export default async function TeamPage() {
  const session = await auth();

  const userData = await prisma.user.findFirst({
    where: {
      email: session?.user?.email,
    },
  });

  const userTeams = await prisma.team.findMany({
    where: {
      users: {
        some: {
          id: userData?.id,
        },
      },
    },
  });

  const allTeams = await prisma.team.findMany();

  const hasPerms =
    userData?.role === $Enums.UserRole.ADMIN ||
    userData?.role === $Enums.UserRole.MANAGER;

  return (
    <>
      <div className="hidden flex-col md:flex">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
              Manage Your Teams
            </h2>
          </div>
          <Tabs defaultValue="teams" className="space-y-4">
            {hasPerms && (
              <TabsList>
                <TabsTrigger value="teams">Teams</TabsTrigger>
                <TabsTrigger value="admin">Admin View</TabsTrigger>
              </TabsList>
            )}

            <TabsContent value="teams" className="space-y-4">
              {userTeams.length > 0 && (
                <Card className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                  {userTeams.map((team) => (
                    <div key={team.id} className="p-2">
                      <Card className="relative min-h-[144px] md:w-60 xl:w-96">
                        <Link href={`/team/${team.id}`}>
                          <Image
                            src={
                              team.image ??
                              `https://avatar.vercel.sh/${team.name}.png`
                            }
                            alt={
                              team.name
                                ? `Avatar for ${team.name}`
                                : "Default team avatar"
                            }
                            width={100}
                            height={100}
                            className="rounded-full float-right p-4"
                          />
                          <CardHeader>
                            <h3 className="text-3xl font-semibold tracking-tight z-10">
                              {team.name}
                            </h3>
                          </CardHeader>
                        </Link>
                      </Card>
                    </div>
                  ))}
                </Card>
              )}
            </TabsContent>
            <TabsContent value="admin" className="space-y-4">
              <Card className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                {allTeams.map((team) => (
                  <div key={team.id} className="p-2">
                    <Card className="relative min-h-[144px] md:w-60 xl:w-96">
                      <Link href={`/team/${team.id}`}>
                        <Image
                          src={
                            team.image ??
                            `https://avatar.vercel.sh/${team.name}.png`
                          }
                          alt={
                            team.name
                              ? `Avatar for ${team.name}`
                              : "Default team avatar"
                          }
                          width={100}
                          height={100}
                          className="rounded-full float-right p-4"
                        />
                        <CardHeader>
                          <h3 className="text-3xl font-semibold tracking-tight z-10">
                            {team.name}
                          </h3>
                        </CardHeader>
                      </Link>
                    </Card>
                  </div>
                ))}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}

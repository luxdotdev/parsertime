import { MainNav } from "@/components/dashboard/main-nav";
import { Search } from "@/components/dashboard/search";
import { TeamSwitcher } from "@/components/dashboard/team-switcher";
import { ModeToggle } from "@/components/theme-switcher";
import { Card, CardHeader } from "@/components/ui/card";
import { UserNav } from "@/components/user-nav";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

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

  return (
    <>
      <div className="hidden flex-col md:flex">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
              Manage Your Teams
            </h2>
          </div>
          {userTeams.length > 0 &&
            userTeams.map((team) => (
              <div key={team.id} className="p-2 w-1/3">
                <Card className="max-w-md relative min-h-[144px]">
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
        </div>
      </div>
    </>
  );
}

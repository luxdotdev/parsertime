import { MainNav } from "@/components/dashboard/main-nav";
import { Search } from "@/components/dashboard/search";
import { TeamSwitcher } from "@/components/dashboard/team-switcher";
import { ModeToggle } from "@/components/theme-switcher";
import { Card, CardHeader } from "@/components/ui/card";
import { UserNav } from "@/components/user-nav";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";

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
                <Card className="max-w-md relative">
                  <Link href={`/team/${team.id}`}>
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

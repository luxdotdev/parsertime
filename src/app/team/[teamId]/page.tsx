import { AddMemberCard } from "@/components/team/add-member-card";
import { UserCardButtons } from "@/components/team/user-card-buttons";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { $Enums, User } from "@prisma/client";
import Image from "next/image";

export default async function Team({ params }: { params: { teamId: string } }) {
  const session = await auth();

  const teamId = parseInt(params.teamId);

  const teamData = await prisma.team.findFirst({
    where: {
      id: teamId,
    },
  });

  const teamMembers = (await prisma.team.findFirst({
    where: {
      id: teamId,
    },
    select: {
      users: true,
    },
  })) ?? { users: [] };

  const teamManagers = (await prisma.team.findFirst({
    where: {
      id: teamId,
    },
    select: {
      managers: true,
    },
  })) ?? { managers: [] };

  const user = await prisma.user.findFirst({
    where: {
      email: session?.user?.email,
    },
  });

  const hasPerms =
    user?.id === teamData?.ownerId ||
    user?.role === $Enums.UserRole.MANAGER ||
    user?.role === $Enums.UserRole.ADMIN;

  function userIsManager(user: User) {
    return teamManagers.managers.some((manager) => manager.userId === user?.id);
  }

  return (
    <>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            {teamData?.name ?? "Team Name"}
          </h2>
        </div>

        <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Members
        </h3>

        {teamMembers?.users.length > 0 && (
          <div className="flex flex-wrap -m-2">
            {teamMembers?.users.map((user) => (
              <div key={user.id} className="p-2 w-1/3">
                <Card className="max-w-md relative min-h-[144px]">
                  <Image
                    src={
                      user.image ?? `https://avatar.vercel.sh/${user.email}.png`
                    }
                    alt={
                      user.name
                        ? `Profile picture of ${user.name}`
                        : "Default user avatar"
                    }
                    width={100}
                    height={100}
                    className="rounded-full float-right p-4"
                  />
                  <CardHeader className="flex">
                    <div>
                      <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
                        {user.name} {userIsManager(user) && "(Manager)"}{" "}
                        {user.id === teamData?.ownerId && "(Owner)"}{" "}
                        {user.name === session?.user?.name && "(You)"}
                      </h4>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p>{user.email}</p>
                  </CardContent>
                  {hasPerms && user.email !== session?.user?.email && (
                    <UserCardButtons user={user} managers={teamManagers} />
                  )}
                </Card>
              </div>
            ))}
            {hasPerms && <AddMemberCard />}
          </div>
        )}
      </div>
    </>
  );
}

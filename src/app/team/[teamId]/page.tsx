import { AddMemberCard } from "@/components/team/add-member-card";
import { DangerZone } from "@/components/team/danger-zone";
import { TeamSettingsForm } from "@/components/team/team-settings-form";
import { UserCardButtons } from "@/components/team/user-card-buttons";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { $Enums, User } from "@prisma/client";
import { Metadata } from "next";
import Image from "next/image";

type Props = { params: { teamId: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const teamId = decodeURIComponent(params.teamId);

  const team = await prisma.team.findFirst({
    where: { id: parseInt(teamId) },
    select: { name: true },
  });

  const teamName = team?.name ?? "Team";

  return {
    title: `${teamName} Overview | Parsertime`,
    description: `Overview for ${teamName} on Parsertime. Parsertime is a tool for analyzing Overwatch scrims.`,
    openGraph: {
      title: `${teamName} Overview | Parsertime`,
      description: `Overview for ${teamName} on Parsertime. Parsertime is a tool for analyzing Overwatch scrims.`,
      url: "https://parsertime.app",
      type: "website",
      siteName: "Parsertime",
      images: [
        {
          url: `https://parsertime.app/api/og?title=${teamName} Overview`,
          width: 1200,
          height: 630,
        },
      ],
      locale: "en_US",
    },
  };
}

export default async function Team({ params }: { params: { teamId: string } }) {
  const session = await auth();

  const teamId = parseInt(params.teamId);

  const [teamData, teamMembersData, teamManagers] = await Promise.all([
    prisma.team.findFirst({ where: { id: teamId } }),
    prisma.team.findFirst({ where: { id: teamId }, select: { users: true } }),
    prisma.teamManager.findMany({ where: { teamId } }),
  ]);

  const teamMembers = teamMembersData ?? { users: [] };

  const user = await getUser(session?.user?.email);

  function userIsManager(user: User) {
    return teamManagers.some((manager) => manager.userId === user.id);
  }

  const hasPerms =
    userIsManager(user!) ||
    user?.id === teamData?.ownerId ||
    user?.role === $Enums.UserRole.MANAGER ||
    user?.role === $Enums.UserRole.ADMIN;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          {teamData?.name ?? "Team Name"}
        </h2>
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        {hasPerms && (
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        )}
        <TabsContent value="members" className="space-y-4">
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
            Members
          </h3>

          {teamMembers?.users.length > 0 && (
            <div className="-m-2 flex flex-wrap">
              {teamMembers?.users.map((user) => (
                <div key={user.id} className="w-full p-2 md:w-1/2 xl:w-1/3">
                  <Card className="relative min-h-[144px] max-w-md">
                    <Image
                      src={
                        user.image ??
                        `https://avatar.vercel.sh/${user.email}.png`
                      }
                      alt={
                        user.name
                          ? `Profile picture of ${user.name}`
                          : "Default user avatar"
                      }
                      width={100}
                      height={100}
                      className="float-right rounded-full p-4"
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
                    {hasPerms &&
                      user.email !== session?.user?.email &&
                      user.id !== teamData?.ownerId && (
                        <UserCardButtons user={user} managers={teamManagers} />
                      )}
                  </Card>
                </div>
              ))}
              {hasPerms && <AddMemberCard />}
            </div>
          )}
        </TabsContent>
        <TabsContent value="settings" className="space-y-4">
          <TeamSettingsForm team={teamData!} />
          <div className="p-4" />
          <DangerZone team={teamData!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

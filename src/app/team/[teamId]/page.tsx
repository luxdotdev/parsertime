import { AddMemberCard } from "@/components/team/add-member-card";
import { DangerZone } from "@/components/team/danger-zone";
import { TeamSettingsForm } from "@/components/team/team-settings-form";
import { UserCardButtons } from "@/components/team/user-card-buttons";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { PagePropsWithLocale } from "@/types/next";
import { $Enums, type User } from "@prisma/client";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

export async function generateMetadata(
  props: PagePropsWithLocale<"/team/[teamId]">
): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations("teamPage.teamMetadata");
  const teamId = decodeURIComponent(params.teamId);

  const team = await prisma.team.findFirst({
    where: { id: parseInt(teamId) },
    select: { name: true },
  });

  const teamName = team?.name ?? t("defaultTeam");

  return {
    title: t("title", { teamName }),
    description: t("description", { teamName }),
    openGraph: {
      title: t("ogTitle", { teamName }),
      description: t("ogDescription", { teamName }),
      url: "https://parsertime.app",
      type: "website",
      siteName: "Parsertime",
      images: [
        {
          url: `https://parsertime.app/api/og?title=${t("ogImage", { teamName })}`,
          width: 1200,
          height: 630,
        },
      ],
      locale: params.locale,
    },
  };
}

export default async function Team(
  props: PagePropsWithLocale<"/team/[teamId]">
) {
  const params = await props.params;
  const t = await getTranslations("teamPage");
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
          {teamData?.name ?? t("defaultName")}
        </h2>
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        {hasPerms && (
          <TabsList>
            <TabsTrigger value="members">{t("members")}</TabsTrigger>
            <TabsTrigger value="settings">{t("settings")}</TabsTrigger>
          </TabsList>
        )}
        <TabsContent value="members" className="space-y-4">
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
            {t("members")}
          </h3>

          {teamMembers?.users.length > 0 && (
            <div className="-m-2 flex flex-wrap">
              {teamMembers?.users.map((user) => (
                <div key={user.id} className="w-full p-2 md:w-1/2 xl:w-1/3">
                  <Card className="relative min-h-[144px] max-w-md">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-4">
                        <CardHeader>
                          <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
                            {user.name} {userIsManager(user) && t("manager")}{" "}
                            {user.id === teamData?.ownerId && t("owner")}{" "}
                            {user.name === session?.user?.name && t("you")}
                          </h4>
                        </CardHeader>
                        <CardContent>
                          <p>{user.email}</p>
                        </CardContent>
                      </div>
                      <div className="flex-shrink-0 pt-0 pr-6">
                        <Image
                          src={
                            user.image ??
                            `https://avatar.vercel.sh/${user.email}.png`
                          }
                          alt={
                            user.name
                              ? t("altText.userProfile", { user: user.name })
                              : t("altText.noAvatar")
                          }
                          width={80}
                          height={80}
                          className="rounded-full"
                        />
                      </div>
                    </div>
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

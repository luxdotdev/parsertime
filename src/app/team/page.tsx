import { EmptyTeamView } from "@/components/team/empty-team-view";
import { Card, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { PagePropsWithLocale } from "@/types/next";
import { $Enums } from "@prisma/client";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";

export async function generateMetadata(
  props: PagePropsWithLocale<"/team">
): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations("teamPage.metadata");
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: "https://parsertime.app",
      type: "website",
      siteName: "Parsertime",
      images: [
        {
          url: `https://parsertime.app/api/og?title=${t("ogImage")}`,
          width: 1200,
          height: 630,
        },
      ],
      locale: params.locale,
    },
  };
}

export default async function TeamPage() {
  const t = await getTranslations("teamPage");

  const session = await auth();

  const userData = await getUser(session?.user?.email);

  const userTeams = await prisma.team.findMany({
    where: { users: { some: { id: userData?.id } } },
  });

  const allTeams = await prisma.team.findMany();

  const hasPerms =
    userData?.role === $Enums.UserRole.ADMIN ||
    userData?.role === $Enums.UserRole.MANAGER;

  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            {hasPerms ? t("manageTeams") : t("viewTeams")}
          </h2>
        </div>
        <Tabs defaultValue="teams" className="space-y-4">
          {hasPerms && (
            <TabsList>
              <TabsTrigger value="teams">{t("teams")}</TabsTrigger>
              <TabsTrigger value="admin">{t("admin")}</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="teams" className="space-y-4">
            {userTeams.length > 0 && (
              <Card className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {userTeams
                  .sort((a, b) => (a.id > b.id ? 1 : -1))
                  .map((team) => (
                    <div key={team.id} className="p-2">
                      <Card className="relative min-h-[144px] md:w-60 xl:w-80">
                        <Link href={`/team/${team.id}`}>
                          <Image
                            src={
                              team.image ??
                              `https://avatar.vercel.sh/${team.name}.png`
                            }
                            alt={
                              team.name
                                ? t("altText.custom", { team: team.name })
                                : t("altText.default")
                            }
                            width={100}
                            height={100}
                            className="float-right rounded-full p-4"
                          />
                          <CardHeader>
                            <h3 className="z-10 text-3xl font-semibold tracking-tight">
                              {team.name}
                            </h3>
                          </CardHeader>
                        </Link>
                      </Card>
                    </div>
                  ))}
              </Card>
            )}
            {userTeams.length === 0 && <EmptyTeamView />}
          </TabsContent>
          <TabsContent value="admin" className="space-y-4">
            <Card className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {allTeams
                .sort((a, b) => (a.id > b.id ? 1 : -1))
                .map((team) => (
                  <div key={team.id} className="p-2">
                    <Card className="relative min-h-[144px] md:w-60 xl:w-80">
                      <Link href={`/team/${team.id}`}>
                        <Image
                          src={
                            team.image ??
                            `https://avatar.vercel.sh/${team.name}.png`
                          }
                          alt={
                            team.name
                              ? t("altText.custom", { team: team.name })
                              : t("altText.default")
                          }
                          width={100}
                          height={100}
                          className="float-right rounded-full p-4"
                        />
                        <CardHeader>
                          <h3 className="z-10 text-3xl font-semibold tracking-tight">
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
  );
}

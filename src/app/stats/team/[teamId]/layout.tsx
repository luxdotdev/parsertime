import prisma from "@/lib/prisma";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata(
  props: LayoutProps<"/stats/team/[teamId]">
): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations("teamStatsPage.layoutMetadata");
  const locale = await getLocale();

  const teamId = parseInt(params.teamId);
  const team = await prisma.team.findFirst({
    where: { id: teamId },
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
      locale,
    },
  };
}

export default function TeamStatsLayout({
  children,
}: LayoutProps<"/stats/team/[teamId]">) {
  return children;
}

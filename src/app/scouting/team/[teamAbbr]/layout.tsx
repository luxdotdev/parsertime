import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata(
  props: LayoutProps<"/scouting/team/[teamAbbr]">
): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations("scoutingPage.team.metadata");
  const locale = await getLocale();

  const team = decodeURIComponent(params.teamAbbr);

  return {
    title: t("title", { team }),
    description: t("description", { team }),
    openGraph: {
      title: t("ogTitle", { team }),
      description: t("ogDescription", { team }),
      url: "https://parsertime.app",
      type: "website",
      siteName: "Parsertime",
      images: [
        {
          url: `https://parsertime.app/api/og?title=${encodeURIComponent(t("ogTitle", { team }))}`,
          width: 1200,
          height: 630,
        },
      ],
      locale,
    },
  };
}

export default function ScoutingTeamLayout({
  children,
}: LayoutProps<"/scouting/team/[teamAbbr]">) {
  return children;
}

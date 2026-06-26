import { defaultLocale } from "@/i18n/config";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import type { Metadata } from "next";

export async function generateMetadata(
  props: LayoutProps<"/scouting/team/[teamAbbr]">
): Promise<Metadata> {
  const params = await props.params;
  const t = getMetadataTranslations("scoutingPage.team.metadata");

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
      locale: defaultLocale,
    },
  };
}

export default function ScoutingTeamLayout({
  children,
}: LayoutProps<"/scouting/team/[teamAbbr]">) {
  return children;
}

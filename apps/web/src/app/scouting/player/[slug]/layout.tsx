import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata(
  props: LayoutProps<"/scouting/player/[slug]">
): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations("scoutingPage.player.profile.metadata");
  const locale = await getLocale();

  const player = decodeURIComponent(params.slug);

  return {
    title: t("title", { player }),
    description: t("description", { player }),
    openGraph: {
      title: t("ogTitle", { player }),
      description: t("ogDescription", { player }),
      url: "https://parsertime.app",
      type: "website",
      siteName: "Parsertime",
      images: [
        {
          url: `https://parsertime.app/api/og?title=${encodeURIComponent(t("ogTitle", { player }))}`,
          width: 1200,
          height: 630,
        },
      ],
      locale,
    },
  };
}

export default function ScoutingPlayerLayout({
  children,
}: LayoutProps<"/scouting/player/[slug]">) {
  return children;
}

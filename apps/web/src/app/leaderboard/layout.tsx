import { DashboardLayout } from "@/components/dashboard-layout";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("leaderboardPage.metadata");
  const locale = await getLocale();

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
      locale,
    },
  };
}

export default function LeaderboardLayout({
  children,
}: LayoutProps<"/leaderboard">) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

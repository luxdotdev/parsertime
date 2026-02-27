import { DashboardLayout } from "@/components/dashboard-layout";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(
  props: LayoutProps<"/scouting">
): Promise<Metadata> {
  const params = (await props.params) as { locale: string };
  const t = await getTranslations("scoutingPage.metadata");

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

export default function ScoutingLayout({ children }: LayoutProps<"/scouting">) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

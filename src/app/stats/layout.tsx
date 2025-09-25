import { DashboardLayout } from "@/components/dashboard-layout";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(
  props: LayoutProps<"/stats">
): Promise<Metadata> {
  const params = (await props.params) as { locale: string };
  const t = await getTranslations("statsPage.layoutMetadata");

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

export default function StatsLayout({ children }: LayoutProps<"/stats">) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

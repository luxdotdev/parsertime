import DashboardLayout from "@/components/dashboard-layout";
import { LayoutPropsWithLocale } from "@/types/next";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(
  props: LayoutPropsWithLocale<"/stats">
): Promise<Metadata> {
  const params = await props.params;
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

export default function StatsLayout({
  children,
}: LayoutPropsWithLocale<"/stats">) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

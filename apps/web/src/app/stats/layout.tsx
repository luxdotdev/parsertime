import { DashboardLayout } from "@/components/dashboard-layout";
import { defaultLocale } from "@/i18n/config";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("statsPage.layoutMetadata");

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
      locale: defaultLocale,
    },
  };
}

export default function StatsLayout({ children }: LayoutProps<"/stats">) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

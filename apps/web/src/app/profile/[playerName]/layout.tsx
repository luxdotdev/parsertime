import { DashboardLayout } from "@/components/dashboard-layout";
import { defaultLocale } from "@/i18n/config";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import type { Metadata } from "next";

export async function generateMetadata(
  props: LayoutProps<"/profile/[playerName]">
): Promise<Metadata> {
  const params = await props.params;
  const t = getMetadataTranslations("profilePage.layoutMetadata");
  const playerName = decodeURIComponent(params.playerName);

  return {
    title: t("title", { playerName }),
    description: t("description", { playerName }),
    openGraph: {
      title: t("ogTitle", { playerName }),
      description: t("ogDescription", { playerName }),
      url: "https://parsertime.app",
      type: "website",
      siteName: "Parsertime",
      images: [
        {
          url: `https://parsertime.app/api/og?title=${t("ogImage", { playerName })}`,
          width: 1200,
          height: 630,
        },
      ],
      locale: defaultLocale,
    },
  };
}

export default function ProfileLayout({
  children,
}: LayoutProps<"/profile/[playerName]">) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

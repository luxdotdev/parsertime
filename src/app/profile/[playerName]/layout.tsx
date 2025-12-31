import { DashboardLayout } from "@/components/dashboard-layout";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata(
  props: LayoutProps<"/profile/[playerName]">
): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations("profilePage.layoutMetadata");
  const locale = await getLocale();
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
      locale,
    },
  };
}

export default function ProfileLayout({
  children,
}: LayoutProps<"/profile/[playerName]">) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

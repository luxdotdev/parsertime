import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("demoPage.metadataLayout");

  return {
    title: {
      template: t("title"),
      default: t("default"),
    },
    description: t("description"),
  };
}

export default function PlayerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import { DashboardLayout } from "@/components/dashboard-layout";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("teamPage.joinMetadata");
  return { title: t("title"), description: t("description") };
}

export default function PublicTeamJoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout guestMode>{children}</DashboardLayout>;
}

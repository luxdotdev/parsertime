import { DashboardLayout } from "@/components/dashboard-layout";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("notifications.metadata");
  return { title: t("title"), description: t("description") };
}

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

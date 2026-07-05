import { DashboardLayout } from "@/components/dashboard-layout";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("coaching.metadata");

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function CoachingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

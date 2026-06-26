import { DashboardLayout } from "@/components/dashboard-layout";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = getMetadataTranslations("dataLabeling.metadata");

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function DataLabelingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

import { DashboardLayout } from "@/components/dashboard-layout";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dataLabeling.metadata");

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

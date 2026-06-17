import { DashboardLayout } from "@/components/dashboard-layout";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("debugPage.metadata");
  return { title: t("title"), description: t("description") };
}

export default function DebugLayout({ children }: LayoutProps<"/debug">) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

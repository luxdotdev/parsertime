import { DashboardLayout } from "@/components/dashboard-layout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reports | Parsertime",
  description: "View shared AI-generated scrim analysis reports.",
};

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

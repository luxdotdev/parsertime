import { DashboardLayout } from "@/components/dashboard-layout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Matchmaker | Parsertime",
  description:
    "Find a scrim partner whose roster sits at a comparable TSR — built on the same skill rating you see on the team page.",
};

export default function MatchmakerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

import DashboardLayout from "@/components/dashboard-layout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stats | Parsertime",
  description: "View your stats and performance metrics on Parsertime.",
  openGraph: {
    title: "Stats | Parsertime",
    description: "View your stats and performance metrics on Parsertime.",
    url: "https://parsertime.app",
    type: "website",
    siteName: "Parsertime",
    images: [
      {
        url: `https://parsertime.app/api/og?title=Statistics`,
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
  },
};

export default function StatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

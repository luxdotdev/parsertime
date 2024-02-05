import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s Overview | Parsertime",
    default: "Player Overview | Parsertime",
  },
  description: "Parsertime is a tool for analyzing Overwatch League matches.",
};

export default function PlayerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

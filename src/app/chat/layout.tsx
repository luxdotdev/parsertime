import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { DashboardLayout } from "@/components/dashboard-layout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analyst | Parsertime",
  description:
    "Your AI analyst for Overwatch scrim data, player performance, and team trends.",
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        <ChatSidebar className="hidden md:flex" />
        <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </DashboardLayout>
  );
}

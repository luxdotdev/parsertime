import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { DashboardLayout } from "@/components/dashboard-layout";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("analyst.metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

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

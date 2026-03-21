import { ChatSidebar } from "@/components/chat/chat-sidebar";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <ChatSidebar className="hidden md:flex" />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}

import { ChatInterface } from "@/components/chat/chat-interface";
import { auth } from "@/lib/auth";
import { aiChat } from "@/lib/flags";
import { redirect } from "next/navigation";

export default async function ChatPage() {
  const [session, aiChatEnabled] = await Promise.all([auth(), aiChat()]);

  if (!session) {
    redirect("/sign-in");
  }

  if (!aiChatEnabled) {
    redirect("/dashboard");
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">AI Chat</h2>
      </div>
      <ChatInterface />
    </div>
  );
}

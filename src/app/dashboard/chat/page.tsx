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
    <div className="flex-1 p-4">
      <ChatInterface />
    </div>
  );
}

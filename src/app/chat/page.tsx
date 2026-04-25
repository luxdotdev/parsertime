import { auth } from "@/lib/auth";
import { aiChat } from "@/lib/flags";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";

const ChatInterface = dynamic(
  () =>
    import("@/components/chat/chat-interface").then((mod) => mod.ChatInterface),
  { ssr: false }
);

export default async function ChatPage() {
  const [session, aiChatEnabled] = await Promise.all([auth(), aiChat()]);

  if (!session) {
    redirect("/sign-in");
  }

  if (!aiChatEnabled) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-0 flex-1">
      <ChatInterface />
    </div>
  );
}

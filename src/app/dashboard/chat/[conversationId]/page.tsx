import { ChatInterface } from "@/components/chat/chat-interface";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { UIMessage } from "ai";
import { notFound } from "next/navigation";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const session = await auth();
  if (!session?.user?.email) notFound();

  const userData = await getUser(session.user.email);
  if (!userData) notFound();

  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, userId: userData.id },
  });

  if (!conversation) notFound();

  return (
    <div className="flex-1 p-4">
      <ChatInterface
        conversationId={conversation.id}
        initialMessages={conversation.messages as unknown as UIMessage[]}
      />
    </div>
  );
}

import { ChatInterface } from "@/components/chat/chat-interface";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
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

  const userData = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!userData) notFound();

  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, userId: userData.id },
  });

  if (!conversation) notFound();

  return (
    <div className="min-h-0 flex-1">
      <ChatInterface
        conversationId={conversation.id}
        initialMessages={conversation.messages as unknown as UIMessage[]}
      />
    </div>
  );
}

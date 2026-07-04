import { ChatInterface } from "@/components/chat/chat-interface";
import { Skeleton } from "@/components/ui/skeleton";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { UIMessage } from "ai";
import { notFound } from "next/navigation";
import { Suspense } from "react";

// Static shell: the page frame prerenders and the conversation streams into
// ONE boundary whose fallback mirrors ChatInterface's own layout (header bar,
// message column, composer) — so navigation shows a single, stable skeleton.
export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  return (
    <div className="min-h-0 flex-1">
      <Suspense fallback={<ConversationSkeleton />}>
        <ConversationPageContent params={params} />
      </Suspense>
    </div>
  );
}

async function ConversationPageContent({
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
    <ChatInterface
      conversationId={conversation.id}
      initialMessages={conversation.messages as unknown as UIMessage[]}
    />
  );
}

// Mirrors ChatInterface's loaded layout: eyebrow + balance chip header,
// gap-8 p-4 message column (right-aligned user bubbles, full-width assistant
// text), and the max-w-3xl composer bar.
function ConversationSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <Skeleton className="h-2.5 w-28" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      <div className="flex-1 overflow-y-hidden">
        <div className="flex flex-col gap-8 p-4">
          <div className="flex justify-end">
            <Skeleton className="h-10 w-56 rounded-lg" />
          </div>

          <div className="max-w-[95%] space-y-2">
            {["a", "b", "c"].map((k) => (
              <Skeleton key={k} className="h-4 w-full" />
            ))}
            <Skeleton className="h-4 w-4/5" />
          </div>

          <div className="flex justify-end">
            <Skeleton className="h-10 w-72 rounded-lg" />
          </div>

          <div className="max-w-[95%] space-y-2">
            {["d", "e"].map((k) => (
              <Skeleton key={k} className="h-4 w-full" />
            ))}
            <Skeleton className="h-4 w-3/5" />
          </div>

          <div className="flex justify-end">
            <Skeleton className="h-10 w-44 rounded-lg" />
          </div>

          <div className="max-w-[95%] space-y-2">
            {["f", "g", "h", "i"].map((k) => (
              <Skeleton key={k} className="h-4 w-full" />
            ))}
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>

      <div className="border-t px-4 py-3">
        <Skeleton className="mx-auto h-11 w-full max-w-3xl rounded-lg" />
      </div>
    </div>
  );
}

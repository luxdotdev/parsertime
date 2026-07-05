import { ChatInterface } from "@/components/chat/chat-interface";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/auth";
import { aiChat } from "@/lib/flags";
import { getFlag } from "@/lib/flags-helpers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

// Static shell: the page frame prerenders and the auth/flag-gated chat
// streams into ONE boundary whose fallback mirrors ChatInterface's empty
// state (header row, centered suggestions, composer), so navigation shows a
// single stable skeleton that the real content replaces in place.
export default function ChatPage() {
  return (
    <div className="min-h-0 flex-1">
      <Suspense fallback={<ChatSkeleton />}>
        <ChatContent />
      </Suspense>
    </div>
  );
}

async function ChatContent() {
  const [session, aiChatEnabled] = await Promise.all([auth(), getFlag(aiChat)]);

  if (!session) {
    redirect("/sign-in");
  }

  if (!aiChatEnabled) {
    redirect("/dashboard");
  }

  return <ChatInterface />;
}

// Mirrors ChatInterface's empty state: eyebrow + balance chip header,
// centered empty-state copy with four suggestion rows, and the composer bar.
function ChatSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden">
        <div className="flex w-full max-w-lg flex-col items-start gap-6 px-4 text-left">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <div className="w-full space-y-1.5">
            <Skeleton className="mb-2 h-3 w-16" />
            {["a", "b", "c", "d"].map((k) => (
              <div
                key={k}
                className="border-border flex w-full items-center gap-3 rounded-md border px-3 py-2.5"
              >
                <Skeleton className="h-3 w-4 shrink-0" />
                <Skeleton className="h-3 flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t px-4 py-3">
        <div className="border-input mx-auto flex max-w-3xl items-end gap-2 rounded-lg border py-2 pr-2 pl-3 shadow-xs">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="size-7 shrink-0 rounded-md" />
        </div>
      </div>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, Trash2Icon } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";

type ConversationSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

async function fetchConversations(): Promise<ConversationSummary[]> {
  const res = await fetch("/api/chat/conversations");
  if (!res.ok) throw new Error("Failed to fetch conversations");
  return res.json() as Promise<ConversationSummary[]>;
}

export function ChatSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: conversations = [] } = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: fetchConversations,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/chat/conversations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: (_data, deletedId) => {
      void queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      if (pathname === `/dashboard/chat/${deletedId}`) {
        router.push("/dashboard/chat");
      }
    },
  });

  const activeId = pathname.startsWith("/dashboard/chat/")
    ? pathname.split("/dashboard/chat/")[1]
    : null;

  return (
    <div
      className={cn("flex h-full w-64 shrink-0 flex-col border-r", className)}
    >
      <div className="flex items-center justify-between px-3 py-3">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Chats
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 active:scale-[0.96]"
          asChild
        >
          <Link href="/dashboard/chat" aria-label="New chat">
            <PlusIcon className="size-4" />
          </Link>
        </Button>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={cn(
              "group flex items-center rounded-md text-sm transition-colors duration-100",
              activeId === conv.id
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
          >
            <Link
              href={`/dashboard/chat/${conv.id}` as Route}
              className="min-w-0 flex-1 truncate px-2.5 py-2"
            >
              {conv.title}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive mr-1 size-7 shrink-0 opacity-0 transition-opacity duration-100 group-hover:opacity-100 active:scale-[0.96]"
              onClick={() => deleteMutation.mutate(conv.id)}
              aria-label={`Delete conversation: ${conv.title}`}
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          </div>
        ))}
        {conversations.length === 0 && (
          <p className="text-muted-foreground px-2 py-6 text-center text-xs">
            No conversations yet
          </p>
        )}
      </nav>
    </div>
  );
}

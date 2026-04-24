"use client";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { BalanceChip } from "@/components/chat/balance-chip";
import { BalanceModal } from "@/components/chat/balance-modal";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import {
  MapPerformanceCard,
  PlayerPerformanceCard,
  ReportCard,
  ScrimAnalysisCard,
  TeamTrendsCard,
  ToolLoading,
} from "@/components/chat/tool-cards";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreditBalance } from "@/hooks/use-credits";
import { MIN_BALANCE_TO_CHAT_CENTS } from "@/lib/chat-pricing";
import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import type { ToolUIPart, UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import {
  CheckIcon,
  ClipboardIcon,
  CornerDownLeftIcon,
  PencilIcon,
  RefreshCwIcon,
  SparklesIcon,
  SquareIcon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const SUGGESTIONS = [
  "How did my team perform in our last scrim?",
  "Which maps do we have the best win rate on?",
  "What are our performance trends this month?",
  "Who had the most outlier stats recently?",
];

const transport = new DefaultChatTransport({ api: "/api/chat" });

type ChatInterfaceProps = {
  conversationId?: string;
  initialMessages?: UIMessage[];
};

export function ChatInterface({
  conversationId: initialConversationId,
  initialMessages,
}: ChatInterfaceProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState(initialConversationId);
  const prevStatusRef = useRef<string | null>(null);

  const { messages, sendMessage, setMessages, regenerate, status, stop } =
    useChat({
      transport,
      messages: initialMessages,
    });
  const [input, setInput] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);

  const { data: balance } = useCreditBalance();
  const blocked =
    balance !== undefined && balance.balanceCents < MIN_BALANCE_TO_CHAT_CENTS;

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    const wasLoading =
      prevStatusRef.current === "streaming" ||
      prevStatusRef.current === "submitted";
    prevStatusRef.current = status;

    if (!wasLoading || status !== "ready" || messages.length === 0) return;

    const firstUserText = messages
      .find((m) => m.role === "user")
      ?.parts.find((p) => p.type === "text");
    const title =
      firstUserText && "text" in firstUserText
        ? firstUserText.text.slice(0, 100)
        : "New conversation";

    if (!conversationId) {
      void fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, messages }),
      })
        .then((res) => res.json() as Promise<{ id: string }>)
        .then((data) => {
          setConversationId(data.id);
          void queryClient.invalidateQueries({
            queryKey: ["chat-conversations"],
          });
          router.replace(`/chat/${data.id}`);
        });
    } else {
      void fetch(`/api/chat/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, messages }),
      }).then(() =>
        queryClient.invalidateQueries({ queryKey: ["chat-conversations"] })
      );
    }
  }, [status, messages, conversationId, queryClient, router]);

  function handleSubmit(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    void sendMessage({ text: trimmed });
    setInput("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(input);
    }
  }

  const handleCopy = useCallback((message: UIMessage) => {
    const text = message.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("\n");
    void navigator.clipboard.writeText(text);
    setCopiedId(message.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleRetry = useCallback(() => {
    if (!isLoading) {
      void regenerate();
    }
  }, [isLoading, regenerate]);

  const handleEditStart = useCallback((message: UIMessage) => {
    const text = message.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("\n");
    setEditingMessageId(message.id);
    setEditText(text);
  }, []);

  const handleEditCancel = useCallback(() => {
    setEditingMessageId(null);
    setEditText("");
  }, []);

  const handleEditSubmit = useCallback(() => {
    if (!editingMessageId || !editText.trim()) return;
    const idx = messages.findIndex((m) => m.id === editingMessageId);
    if (idx === -1) return;
    const prior = messages.slice(0, idx);
    setMessages(prior);
    setEditingMessageId(null);
    void sendMessage({ text: editText.trim() });
    setEditText("");
  }, [editingMessageId, editText, messages, setMessages, sendMessage]);

  function handleEditKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEditSubmit();
    }
    if (e.key === "Escape") {
      handleEditCancel();
    }
  }

  const lastAssistantIdx = messages.findLastIndex(
    (m) => m.role === "assistant"
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end border-b px-4 py-2">
        <BalanceChip />
      </div>
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState>
              <div className="flex flex-col items-center gap-6">
                <div className="flex flex-col items-center gap-2">
                  <SparklesIcon
                    className="text-primary size-8"
                    aria-hidden="true"
                  />
                  <h3 className="text-base font-medium text-balance">
                    Analyst
                  </h3>
                  <p className="text-muted-foreground max-w-sm text-center text-sm text-pretty">
                    Your AI-powered scrim analyst. Ask about team performance,
                    fight breakdowns, ability impact, and more.
                  </p>
                </div>
                {blocked ? (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-muted-foreground max-w-sm text-center text-xs">
                      Add credits to start a conversation. AI chat is
                      pay-as-you-go — $5 minimum.
                    </p>
                    <Button size="sm" onClick={() => setBalanceModalOpen(true)}>
                      Add credits
                    </Button>
                  </div>
                ) : (
                  <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
                    {SUGGESTIONS.map((s) => (
                      <Button
                        key={s}
                        variant="outline"
                        size="sm"
                        className="h-auto cursor-pointer justify-start px-3 py-2.5 text-left text-xs whitespace-normal active:scale-[0.98]"
                        onClick={() => handleSubmit(s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((message, messageIdx) => (
              <Message key={message.id} from={message.role}>
                {message.role === "user" && editingMessageId === message.id ? (
                  <MessageContent>
                    <div className="flex flex-col gap-2">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        rows={2}
                        className="resize-none text-sm"
                        // oxlint-disable-next-line jsx-a11y/no-autofocus -- intentional focus management for edit mode
                        autoFocus
                      />
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleEditCancel}
                          className="active:scale-[0.96]"
                        >
                          <XIcon className="mr-1 size-3" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleEditSubmit}
                          disabled={!editText.trim()}
                          className="active:scale-[0.96]"
                        >
                          Resend
                        </Button>
                      </div>
                    </div>
                  </MessageContent>
                ) : (
                  <>
                    <MessageContent>
                      {message.parts.map((part, partIndex) => {
                        const partKey = `${message.id}-${part.type}-${partIndex}`;
                        if (part.type === "text") {
                          return (
                            <MessageResponse
                              key={partKey}
                              isAnimating={
                                isLoading &&
                                message.role === "assistant" &&
                                partIndex === message.parts.length - 1
                              }
                            >
                              {part.text}
                            </MessageResponse>
                          );
                        }

                        if (part.type.startsWith("tool-")) {
                          const toolPart = part as ToolUIPart;
                          const toolName = part.type.slice(5);
                          const card = renderToolCard(toolName, toolPart);
                          if (card)
                            return (
                              <div key={toolPart.toolCallId} className="w-full">
                                {card}
                              </div>
                            );

                          return (
                            <Tool key={toolPart.toolCallId}>
                              <ToolHeader
                                type={toolPart.type}
                                state={toolPart.state}
                                title={formatToolName(toolName)}
                              />
                              <ToolContent>
                                <ToolInput input={toolPart.input} />
                                {toolPart.state === "output-available" && (
                                  <ToolOutput
                                    output={toolPart.output}
                                    errorText={undefined}
                                  />
                                )}
                                {toolPart.state === "output-error" && (
                                  <ToolOutput
                                    output={undefined}
                                    errorText={toolPart.errorText}
                                  />
                                )}
                              </ToolContent>
                            </Tool>
                          );
                        }

                        return null;
                      })}
                    </MessageContent>

                    {!isLoading && (
                      <MessageActions
                        className={`transition-opacity duration-150 ${message.role === "user" ? "ml-auto" : ""} opacity-0 group-hover:opacity-100`}
                      >
                        {message.role === "assistant" && (
                          <MessageAction
                            tooltip="Copy"
                            onClick={() => handleCopy(message)}
                          >
                            <span className="relative grid size-3.5 place-items-center">
                              <ClipboardIcon
                                className={`col-start-1 row-start-1 size-3.5 transition-[scale,opacity] duration-200 ${copiedId === message.id ? "scale-50 opacity-0" : "scale-100 opacity-100"}`}
                              />
                              <CheckIcon
                                className={`col-start-1 row-start-1 size-3.5 transition-[scale,opacity] duration-200 ${copiedId === message.id ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}
                              />
                            </span>
                          </MessageAction>
                        )}
                        {message.role === "assistant" &&
                          messageIdx === lastAssistantIdx && (
                            <MessageAction
                              tooltip="Regenerate"
                              onClick={handleRetry}
                            >
                              <RefreshCwIcon className="size-3.5" />
                            </MessageAction>
                          )}
                        {message.role === "user" && (
                          <MessageAction
                            tooltip="Edit"
                            onClick={() => handleEditStart(message)}
                          >
                            <PencilIcon className="size-3.5" />
                          </MessageAction>
                        )}
                      </MessageActions>
                    )}
                  </>
                )}
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="px-4 py-3 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
        {blocked && (
          <div className="mx-auto mb-2 flex max-w-3xl items-center justify-between gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            <span>
              Your balance is too low to start a new message. Add credits to
              continue chatting — your past conversations stay visible in
              read-only mode.
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 shrink-0"
              onClick={() => setBalanceModalOpen(true)}
            >
              Add credits
            </Button>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (blocked) {
              setBalanceModalOpen(true);
              return;
            }
            handleSubmit(input);
          }}
          className="relative mx-auto max-w-3xl"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              blocked
                ? "Add credits to continue chatting…"
                : "Ask about your team's performance…"
            }
            disabled={isLoading || blocked}
            rows={1}
            className="resize-none pr-12 text-sm"
          />
          <Button
            type={isLoading ? "button" : "submit"}
            size="icon"
            variant="ghost"
            disabled={blocked && !isLoading}
            className="absolute right-1.5 bottom-1.5 size-8 active:scale-[0.96]"
            onClick={isLoading ? stop : undefined}
            aria-label={isLoading ? "Stop generating" : "Send message"}
          >
            <span className="relative grid size-4 place-items-center">
              <CornerDownLeftIcon
                className={`col-start-1 row-start-1 size-4 transition-[scale,opacity] duration-150 ${isLoading ? "scale-50 opacity-0" : "scale-100 opacity-100"}`}
              />
              <SquareIcon
                className={`col-start-1 row-start-1 size-4 transition-[scale,opacity] duration-150 ${isLoading ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}
              />
            </span>
          </Button>
        </form>
      </div>
      <BalanceModal
        open={balanceModalOpen}
        onOpenChange={setBalanceModalOpen}
      />
    </div>
  );
}

function renderToolCard(toolName: string, part: ToolUIPart): React.ReactNode {
  if (part.state === "input-available" || part.state === "input-streaming") {
    return <ToolLoading toolName={formatToolName(toolName)} />;
  }

  if (part.state === "output-error") {
    return null;
  }

  if (part.state !== "output-available" || !part.output) {
    return null;
  }

  const output = part.output as Record<string, unknown>;

  switch (toolName) {
    case "getScrimAnalysis":
      if (output.mapCount != null && !output.error)
        return (
          <ScrimAnalysisCard
            {...(output as unknown as React.ComponentProps<
              typeof ScrimAnalysisCard
            >)}
          />
        );
      break;
    case "getMapPerformance":
      if (output.byMap)
        return (
          <MapPerformanceCard
            {...(output as unknown as React.ComponentProps<
              typeof MapPerformanceCard
            >)}
          />
        );
      break;
    case "getTeamTrends":
      if (output.winrateOverTime)
        return (
          <TeamTrendsCard
            {...(output as unknown as React.ComponentProps<
              typeof TeamTrendsCard
            >)}
          />
        );
      break;
    case "getPlayerPerformance":
      if (output.playerName && !output.error)
        return (
          <PlayerPerformanceCard
            {...(output as unknown as React.ComponentProps<
              typeof PlayerPerformanceCard
            >)}
          />
        );
      break;
    case "generateReport":
      if (output.url)
        return (
          <ReportCard
            {...(output as unknown as React.ComponentProps<typeof ReportCard>)}
          />
        );
      break;
  }

  return null;
}

function formatToolName(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

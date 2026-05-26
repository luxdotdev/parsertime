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
  SquareIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const EYEBROW =
  "text-muted-foreground font-mono text-[11px] font-medium tracking-[0.16em] uppercase";

const transport = new DefaultChatTransport({ api: "/api/chat" });

type ChatInterfaceProps = {
  conversationId?: string;
  initialMessages?: UIMessage[];
};

export function ChatInterface({
  conversationId: initialConversationId,
  initialMessages,
}: ChatInterfaceProps) {
  const t = useTranslations("analyst");
  const suggestions = t.raw("empty.suggestions") as string[];
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
        : t("newConversation");

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
  }, [status, messages, conversationId, queryClient, router, t]);

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
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <span className={EYEBROW}>{t("eyebrow")}</span>
        <BalanceChip />
      </div>
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState className="justify-center">
              <div className="flex w-full max-w-lg flex-col items-start gap-6 text-left">
                <div className="space-y-2">
                  <p className={EYEBROW}>{t("eyebrow")}</p>
                  <h2 className="text-foreground text-xl font-semibold tracking-tight text-balance">
                    {t("empty.title")}
                  </h2>
                  <p className="text-muted-foreground text-sm text-pretty">
                    {t("empty.description")}
                  </p>
                </div>
                {blocked ? (
                  <div className="border-border w-full space-y-3 rounded-md border border-dashed p-4">
                    <p className="text-muted-foreground text-xs text-pretty">
                      {t("empty.blocked.description")}
                    </p>
                    <Button size="sm" onClick={() => setBalanceModalOpen(true)}>
                      {t("empty.blocked.addCredits")}
                    </Button>
                  </div>
                ) : (
                  <div className="w-full space-y-1.5">
                    <p className={EYEBROW}>{t("empty.tryAsking")}</p>
                    {suggestions.map((s, i) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleSubmit(s)}
                        className="group/prompt border-border hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-ring/50 flex w-full cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors outline-none focus-visible:ring-[3px] active:scale-[0.99]"
                      >
                        <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="flex-1 text-pretty">{s}</span>
                        <CornerDownLeftIcon
                          className="text-muted-foreground size-3.5 shrink-0 opacity-0 transition-opacity group-hover/prompt:opacity-100"
                          aria-hidden="true"
                        />
                      </button>
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
                          {t("edit.cancel")}
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleEditSubmit}
                          disabled={!editText.trim()}
                          className="active:scale-[0.96]"
                        >
                          {t("edit.resend")}
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
                            tooltip={t("actions.copy")}
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
                              tooltip={t("actions.regenerate")}
                              onClick={handleRetry}
                            >
                              <RefreshCwIcon className="size-3.5" />
                            </MessageAction>
                          )}
                        {message.role === "user" && (
                          <MessageAction
                            tooltip={t("actions.edit")}
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

      <div className="border-t px-4 py-3">
        {blocked && (
          <div className="border-border bg-muted/40 mx-auto mb-2 flex max-w-3xl items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs">
            <span className="text-muted-foreground text-pretty">
              {t("blockedBanner.message")}
            </span>
            <Button
              size="sm"
              className="shrink-0"
              onClick={() => setBalanceModalOpen(true)}
            >
              {t("blockedBanner.addCredits")}
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
          className="border-input focus-within:border-ring focus-within:ring-ring/50 dark:bg-input/30 mx-auto flex max-w-3xl items-end gap-2 rounded-lg border py-2 pr-2 pl-3 shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              blocked
                ? t("composer.placeholderBlocked")
                : t("composer.placeholder")
            }
            disabled={isLoading || blocked}
            rows={1}
            className="max-h-40 min-h-0 flex-1 resize-none border-0 bg-transparent px-0 py-1.5 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <Button
            type={isLoading ? "button" : "submit"}
            size="icon-sm"
            variant={isLoading ? "ghost" : "default"}
            disabled={blocked && !isLoading}
            className="shrink-0 active:scale-[0.96]"
            onClick={isLoading ? stop : undefined}
            aria-label={isLoading ? t("composer.stop") : t("composer.send")}
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

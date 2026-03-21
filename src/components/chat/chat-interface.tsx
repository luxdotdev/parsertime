"use client";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChat } from "@ai-sdk/react";
import type { ToolUIPart, UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import {
  BotMessageSquareIcon,
  CheckIcon,
  ClipboardIcon,
  CornerDownLeftIcon,
  PencilIcon,
  RefreshCwIcon,
  SquareIcon,
  XIcon,
} from "lucide-react";
import { type KeyboardEvent, useCallback, useState } from "react";

const SUGGESTIONS = [
  "How did my team perform in our last scrim?",
  "Which maps do we have the best win rate on?",
  "What are our performance trends this month?",
  "Who had the most outlier stats recently?",
];

const transport = new DefaultChatTransport({ api: "/api/chat" });

export function ChatInterface() {
  const { messages, sendMessage, setMessages, regenerate, status, stop } =
    useChat({ transport });
  const [input, setInput] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isLoading = status === "streaming" || status === "submitted";

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
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState>
              <div className="flex flex-col items-center gap-6">
                <div className="flex flex-col items-center gap-2">
                  <BotMessageSquareIcon className="text-muted-foreground size-8" />
                  <h3 className="text-base font-medium">Parsertime AI</h3>
                  <p className="text-muted-foreground max-w-sm text-center text-sm">
                    Ask questions about your team&apos;s scrim data, player
                    performance, map win rates, and more.
                  </p>
                </div>
                <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      className="h-auto cursor-pointer justify-start px-3 py-2 text-left text-xs whitespace-normal"
                      onClick={() => handleSubmit(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
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
                        autoFocus
                      />
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleEditCancel}
                        >
                          <XIcon className="mr-1 size-3" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleEditSubmit}
                          disabled={!editText.trim()}
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
                        className={`opacity-0 transition-opacity group-hover:opacity-100 ${message.role === "user" ? "ml-auto" : ""}`}
                      >
                        {message.role === "assistant" && (
                          <MessageAction
                            tooltip="Copy"
                            onClick={() => handleCopy(message)}
                          >
                            {copiedId === message.id ? (
                              <CheckIcon className="size-3.5" />
                            ) : (
                              <ClipboardIcon className="size-3.5" />
                            )}
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

      <div className="border-t px-4 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(input);
          }}
          className="relative mx-auto max-w-3xl"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your team's performance..."
            disabled={isLoading}
            rows={1}
            className="resize-none pr-12 text-sm"
          />
          <Button
            type={isLoading ? "button" : "submit"}
            size="icon"
            variant="ghost"
            className="absolute right-1.5 bottom-1.5 size-7"
            onClick={isLoading ? stop : undefined}
            aria-label={isLoading ? "Stop" : "Send"}
          >
            {isLoading ? (
              <SquareIcon className="size-4" />
            ) : (
              <CornerDownLeftIcon className="size-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

function formatToolName(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

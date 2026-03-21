import { Logger } from "@/lib/logger";
import type { TelemetryIntegration } from "ai";

export function chatTelemetry(userId: string): TelemetryIntegration {
  const startTime = Date.now();
  const toolCalls: {
    name: string;
    durationMs: number;
    success: boolean;
    error?: string;
  }[] = [];
  let model = "";
  let stepCount = 0;

  return {
    onStart(event) {
      model = event.model.modelId;
    },

    onToolCallFinish(event) {
      toolCalls.push({
        name: event.toolCall.toolName,
        durationMs: event.durationMs,
        success: event.success,
        ...(event.success ? {} : { error: String(event.error) }),
      });
    },

    onStepFinish() {
      stepCount++;
    },

    onFinish(event) {
      Logger.info({
        event: "ai.chat",
        userId,
        model,
        durationMs: Date.now() - startTime,
        steps: stepCount,
        inputTokens: event.totalUsage.inputTokens,
        outputTokens: event.totalUsage.outputTokens,
        totalTokens: event.totalUsage.totalTokens,
        finishReason: event.finishReason,
        toolCallCount: toolCalls.length,
        toolCalls,
        hasError: toolCalls.some((t) => !t.success),
      });
    },
  };
}

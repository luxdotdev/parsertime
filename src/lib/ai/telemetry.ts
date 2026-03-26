import {
  chatRequestCounter,
  chatResponseDuration,
  chatTokensCounter,
  chatToolCallCounter,
  chatToolCallDuration,
} from "@/lib/axiom/metrics";
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

      chatToolCallCounter.add(1, {
        tool_name: event.toolCall.toolName,
        success: String(event.success),
        model,
      });
      chatToolCallDuration.record(event.durationMs, {
        tool_name: event.toolCall.toolName,
        model,
      });
    },

    onStepFinish() {
      stepCount++;
    },

    onFinish(event) {
      const durationMs = Date.now() - startTime;

      Logger.info({
        event: "ai.chat",
        userId,
        model,
        durationMs,
        steps: stepCount,
        inputTokens: event.totalUsage.inputTokens,
        outputTokens: event.totalUsage.outputTokens,
        totalTokens: event.totalUsage.totalTokens,
        finishReason: event.finishReason,
        toolCallCount: toolCalls.length,
        toolCalls,
        hasError: toolCalls.some((t) => !t.success),
      });

      chatRequestCounter.add(1, { model, finish_reason: event.finishReason });
      chatTokensCounter.add(event.totalUsage.inputTokens ?? 0, {
        type: "input",
        model,
      });
      chatTokensCounter.add(event.totalUsage.outputTokens ?? 0, {
        type: "output",
        model,
      });
      chatResponseDuration.record(durationMs, { model });
    },
  };
}

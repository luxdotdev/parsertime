import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "./logger.ts";

const tracer = trace.getTracer("discord-bot");

export async function tracedDeferReply(
  interaction: ChatInputCommandInteraction,
  options?: Parameters<typeof interaction.deferReply>[0],
) {
  return tracer.startActiveSpan("discord.deferReply", async (span) => {
    try {
      const deferStart = Date.now();
      await interaction.deferReply(options);
      span.setAttributes({ "discord.defer_ms": Date.now() - deferStart });
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      logger.error({
        type: "defer_reply_failed",
        command: interaction.commandName,
        interaction_id: interaction.id,
        interaction_created_at: interaction.createdTimestamp,
        age_ms: Date.now() - interaction.createdTimestamp,
        error:
          error instanceof Error
            ? { message: error.message, type: error.name }
            : { message: String(error) },
      });
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof Error) span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}

export async function tracedEditReply(
  interaction: ChatInputCommandInteraction,
  options: Parameters<typeof interaction.editReply>[0],
) {
  return tracer.startActiveSpan("discord.editReply", async (span) => {
    try {
      const result = await interaction.editReply(options);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof Error) span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}

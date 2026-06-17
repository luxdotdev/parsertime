import { SpanStatusCode, context, propagation, trace } from "@opentelemetry/api";
import type { Client } from "discord.js";
import { logger } from "../utils/logger.ts";
import { verifyBotSecret } from "./middleware/auth.ts";
import {
  getGuildChannelsForUser,
  getGuildsForUser,
  isUserGuildMember,
} from "./routes/guilds.ts";
import {
  sendNotification,
  type NotificationPayload,
} from "./routes/notifications.ts";

const tracer = trace.getTracer("discord-bot");

export function startServer(client: Client, port: number) {
  const server = Bun.serve({
    port,
    async fetch(req) {
      const startTime = Date.now();
      const url = new URL(req.url);
      const event: Record<string, unknown> = {
        type: "http_request",
        method: req.method,
        path: url.pathname,
      };

      // Extract trace context from incoming headers (traceparent/tracestate)
      const carrier: Record<string, string> = {};
      req.headers.forEach((value, key) => {
        carrier[key] = value;
      });
      const parentContext = propagation.extract(context.active(), carrier);

      return context.with(parentContext, () =>
        tracer.startActiveSpan(
          `${req.method} ${url.pathname}`,
          async (span) => {
          span.setAttributes({
            "http.method": req.method,
            "http.url": url.pathname,
          });

          try {
            if (url.pathname === "/health") {
              event.outcome = "success";
              event.status_code = 200;
              span.setAttributes({ "http.status_code": 200 });
              span.setStatus({ code: SpanStatusCode.OK });
              return Response.json({ status: "ok" });
            }

            if (!verifyBotSecret(req)) {
              event.outcome = "unauthorized";
              event.status_code = 401;
              span.setAttributes({ "http.status_code": 401 });
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: "Unauthorized",
              });
              return Response.json({ error: "Unauthorized" }, { status: 401 });
            }

            if (req.method === "GET" && url.pathname === "/api/guilds") {
              const userId = url.searchParams.get("userId");
              if (!userId) {
                event.outcome = "bad_request";
                event.status_code = 400;
                span.setAttributes({ "http.status_code": 400 });
                span.setStatus({
                  code: SpanStatusCode.ERROR,
                  message: "userId required",
                });
                return Response.json(
                  { error: "userId query parameter is required" },
                  { status: 400 },
                );
              }
              span.setAttributes({ "discord.user_id": userId });
              const guilds = await getGuildsForUser(client, userId);
              event.outcome = "success";
              event.status_code = 200;
              event.guild_count = guilds.length;
              event.user_id = userId;
              span.setAttributes({
                "http.status_code": 200,
                "bot.guild_count": guilds.length,
              });
              span.setStatus({ code: SpanStatusCode.OK });
              return Response.json(guilds);
            }

            const memberCheckMatch = url.pathname.match(
              /^\/api\/guilds\/(\d+)\/members\/(\d+)$/,
            );
            if (req.method === "GET" && memberCheckMatch) {
              const guildId = memberCheckMatch[1];
              const userId = memberCheckMatch[2];
              const member = await isUserGuildMember(client, guildId, userId);
              event.outcome = "success";
              event.status_code = 200;
              event.guild_id = guildId;
              event.user_id = userId;
              event.is_member = member;
              span.setAttributes({
                "http.status_code": 200,
                "discord.guild_id": guildId,
                "discord.user_id": userId,
                "bot.is_member": member,
              });
              span.setStatus({ code: SpanStatusCode.OK });
              return Response.json({ member });
            }

            const channelsMatch = url.pathname.match(
              /^\/api\/guilds\/(\d+)\/channels$/,
            );
            if (req.method === "GET" && channelsMatch) {
              const guildId = channelsMatch[1];
              const userId = url.searchParams.get("userId");
              if (!userId) {
                event.outcome = "bad_request";
                event.status_code = 400;
                span.setAttributes({ "http.status_code": 400 });
                span.setStatus({
                  code: SpanStatusCode.ERROR,
                  message: "userId required",
                });
                return Response.json(
                  { error: "userId query parameter is required" },
                  { status: 400 },
                );
              }
              span.setAttributes({
                "discord.guild_id": guildId,
                "discord.user_id": userId,
              });
              const channels = await getGuildChannelsForUser(
                client,
                guildId,
                userId,
              );
              if (channels === null) {
                event.outcome = "forbidden";
                event.status_code = 403;
                event.guild_id = guildId;
                event.user_id = userId;
                span.setAttributes({ "http.status_code": 403 });
                span.setStatus({
                  code: SpanStatusCode.ERROR,
                  message: "User is not a member of the guild",
                });
                return Response.json(
                  { error: "User is not a member of that guild" },
                  { status: 403 },
                );
              }
              event.outcome = "success";
              event.status_code = 200;
              event.guild_id = guildId;
              event.user_id = userId;
              event.channel_count = channels.length;
              span.setAttributes({
                "http.status_code": 200,
                "bot.channel_count": channels.length,
              });
              span.setStatus({ code: SpanStatusCode.OK });
              return Response.json(channels);
            }

            if (
              req.method === "POST" &&
              url.pathname === "/api/notifications/send"
            ) {
              const body: NotificationPayload = await req.json();
              event.guild_id = body.guildId;
              event.channel_id = body.channelId;
              event.notification_event = body.event;
              event.team_id = body.data.teamId;
              span.setAttributes({
                "discord.guild_id": body.guildId,
                "discord.channel_id": body.channelId,
                "bot.notification_event": body.event,
                "bot.team_id": body.data.teamId,
              });

              await sendNotification(client, body);

              event.outcome = "success";
              event.status_code = 200;
              span.setAttributes({ "http.status_code": 200 });
              span.setStatus({ code: SpanStatusCode.OK });
              return Response.json({ success: true });
            }

            event.outcome = "not_found";
            event.status_code = 404;
            span.setAttributes({ "http.status_code": 404 });
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: "Not found",
            });
            return Response.json({ error: "Not found" }, { status: 404 });
          } catch (error) {
            event.outcome = "error";
            event.status_code = 500;
            event.error =
              error instanceof Error
                ? { message: error.message, type: error.name }
                : { message: String(error) };

            span.setAttributes({ "http.status_code": 500 });
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error instanceof Error ? error.message : String(error),
            });
            if (error instanceof Error) {
              span.recordException(error);
            }

            return Response.json(
              { error: "Internal server error" },
              { status: 500 },
            );
          } finally {
            event.duration_ms = Date.now() - startTime;
            if (event.outcome === "error") {
              logger.error(event);
            } else {
              logger.info(event);
            }
            span.end();
          }
        }),
      );
    },
  });

  logger.info({ type: "server_start", port: server.port });

  return server;
}

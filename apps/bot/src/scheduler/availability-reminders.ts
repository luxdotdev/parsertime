import type { Client } from "discord.js";
import { logger } from "../utils/logger.ts";
import { sendNotification } from "../api/routes/notifications.ts";

type PendingReminder = {
  teamId: number;
  teamName: string;
  scheduleId: string;
  url: string;
  weekStart: string;
  weekEnd: string;
  guildId: string;
  channelId: string;
  roleId: string | null;
};

const TICK_INTERVAL_MS = 60_000;

async function fetchPending(apiUrl: string, secret: string) {
  const res = await fetch(
    `${apiUrl}/api/internal/availability/pending-reminders`,
    {
      headers: { Authorization: `Bearer ${secret}` },
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `pending-reminders ${res.status}${body ? `: ${body.slice(0, 120)}` : ""}`,
    );
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `pending-reminders returned non-JSON (${contentType || "no content-type"})${body ? `: ${body.slice(0, 120)}` : ""}`,
    );
  }
  const json = (await res.json()) as { pending: PendingReminder[] };
  return json.pending;
}

async function ack(apiUrl: string, secret: string, teamId: number) {
  const res = await fetch(`${apiUrl}/api/internal/availability/reminders/ack`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ teamId }),
  });
  if (!res.ok) {
    throw new Error(`ack ${res.status}`);
  }
}

let lastFetchErrorMessage: string | null = null;

async function tick(client: Client, apiUrl: string, secret: string) {
  let pending: PendingReminder[];
  try {
    pending = await fetchPending(apiUrl, secret);
    if (lastFetchErrorMessage !== null) {
      logger.info({ type: "availability_reminder_fetch_recovered" });
      lastFetchErrorMessage = null;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message !== lastFetchErrorMessage) {
      logger.error({ type: "availability_reminder_fetch_failed", error: message });
      lastFetchErrorMessage = message;
    }
    return;
  }

  if (pending.length === 0) return;

  for (const job of pending) {
    try {
      await sendNotification(client, {
        guildId: job.guildId,
        channelId: job.channelId,
        event: "availability.reminder",
        data: {
          teamId: job.teamId,
          teamName: job.teamName,
          scheduleId: job.scheduleId,
          url: job.url,
          weekStart: job.weekStart,
          weekEnd: job.weekEnd,
          roleId: job.roleId,
        },
      });
      await ack(apiUrl, secret, job.teamId);
      logger.info({
        type: "availability_reminder_sent",
        team_id: job.teamId,
        schedule_id: job.scheduleId,
      });
    } catch (error) {
      logger.error({
        type: "availability_reminder_send_failed",
        team_id: job.teamId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export function startAvailabilityReminderScheduler(client: Client) {
  const apiUrl = process.env.PARSERTIME_API_URL;
  const secret = process.env.BOT_SECRET;
  if (!apiUrl || !secret) {
    logger.info({
      type: "availability_reminder_scheduler_disabled",
      reason: "PARSERTIME_API_URL or BOT_SECRET not set",
    });
    return;
  }

  logger.info({
    type: "availability_reminder_scheduler_started",
    interval_ms: TICK_INTERVAL_MS,
  });

  const run = () => {
    void tick(client, apiUrl, secret);
  };

  run();
  setInterval(run, TICK_INTERVAL_MS);
}

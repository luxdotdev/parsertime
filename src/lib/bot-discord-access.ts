import { context, propagation } from "@opentelemetry/api";

export type DiscordAccessResult =
  | { ok: true }
  | { ok: false; reason: "misconfigured" | "forbidden" };

/**
 * Confirms the given Discord user is a member of the guild by asking the bot,
 * which can see guild membership the web app cannot. Returns "misconfigured"
 * when the bot API isn't reachable so callers can surface a 503 rather than a
 * 403.
 */
export async function verifyUserInGuild(
  discordUserId: string,
  guildId: string
): Promise<DiscordAccessResult> {
  const botApiUrl = process.env.BOT_API_URL;
  const botSecret = process.env.BOT_SECRET;

  if (!botApiUrl || !botSecret) {
    return { ok: false, reason: "misconfigured" };
  }

  const traceHeaders: Record<string, string> = {};
  propagation.inject(context.active(), traceHeaders);

  const response = await fetch(
    `${botApiUrl}/api/guilds/${encodeURIComponent(guildId)}/members/${encodeURIComponent(discordUserId)}`,
    {
      headers: {
        Authorization: `Bearer ${botSecret}`,
        ...traceHeaders,
      },
    }
  );

  if (!response.ok) {
    return { ok: false, reason: "forbidden" };
  }

  const data = (await response.json()) as { member?: boolean };
  return data.member ? { ok: true } : { ok: false, reason: "forbidden" };
}

/**
 * Confirms the given Discord user can use the channel. The bot only returns
 * channels for guilds the user belongs to, so this also implies guild
 * membership. Returns "misconfigured" when the bot API isn't reachable.
 */
export async function verifyUserCanUseChannel(
  discordUserId: string,
  guildId: string,
  channelId: string
): Promise<DiscordAccessResult> {
  const botApiUrl = process.env.BOT_API_URL;
  const botSecret = process.env.BOT_SECRET;

  if (!botApiUrl || !botSecret) {
    return { ok: false, reason: "misconfigured" };
  }

  const traceHeaders: Record<string, string> = {};
  propagation.inject(context.active(), traceHeaders);

  const response = await fetch(
    `${botApiUrl}/api/guilds/${encodeURIComponent(guildId)}/channels?userId=${encodeURIComponent(discordUserId)}`,
    {
      headers: {
        Authorization: `Bearer ${botSecret}`,
        ...traceHeaders,
      },
    }
  );

  if (!response.ok) {
    return { ok: false, reason: "forbidden" };
  }

  const channels = (await response.json()) as { id?: string }[];
  return channels.some((channel) => channel.id === channelId)
    ? { ok: true }
    : { ok: false, reason: "forbidden" };
}

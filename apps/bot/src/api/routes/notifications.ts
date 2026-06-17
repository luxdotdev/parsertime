import { EmbedBuilder, type Client } from "discord.js";

type ScrimCreatedData = {
  scrimName: string;
  scrimId: number;
  createdBy: string;
  teamId: number;
};

type ScrimRequestData = {
  fromTeamId: number;
  fromTeamName: string;
  fromBracketLabel: string;
  fromTsr: number;
  toTsr: number;
  fromRoster: Array<{ battletag: string; tsr: number | null }>;
  message: string;
  teamId: number; // recipient — matches BotNotificationConfig.teamIds
};

type AvailabilityReminderData = {
  teamId: number;
  teamName: string;
  scheduleId: string;
  url: string;
  weekStart: string;
  weekEnd: string;
  roleId?: string | null;
};

type ScrimNotification = {
  guildId: string;
  channelId: string;
  event: "scrim.created";
  data: ScrimCreatedData;
};

type AvailabilityReminderNotification = {
  guildId: string;
  channelId: string;
  event: "availability.reminder";
  data: AvailabilityReminderData;
};

type ScrimRequestNotification = {
  guildId: string;
  channelId: string;
  event: "scrim.request";
  data: ScrimRequestData;
};

export type NotificationPayload =
  | ScrimNotification
  | AvailabilityReminderNotification
  | ScrimRequestNotification;

export async function sendNotification(
  client: Client,
  body: NotificationPayload,
) {
  const channel = await client.channels.fetch(body.channelId);
  if (!channel?.isTextBased() || !("send" in channel)) {
    throw new Error("Channel not found or not text-based");
  }

  if (body.event === "scrim.created") {
    const embed = new EmbedBuilder()
      .setTitle("New Scrim Created")
      .setDescription(
        `**${body.data.scrimName}** was created by ${body.data.createdBy}`,
      )
      .setColor(0x0ea5e9)
      .setTimestamp();
    await channel.send({ embeds: [embed] });
    return;
  }

  if (body.event === "scrim.request") {
    const delta = body.data.fromTsr - body.data.toTsr;
    const sign = delta > 0 ? "+" : delta < 0 ? "-" : "±";
    const deltaLabel = `${sign}${Math.abs(delta)}`;
    const rosterLines = body.data.fromRoster
      .slice(0, 5)
      .map(
        (p) =>
          `• ${p.battletag}: TSR ${p.tsr !== null ? p.tsr : "—"}`,
      )
      .join("\n");
    const embed = new EmbedBuilder()
      .setTitle(`${body.data.fromTeamName} wants to scrim`)
      .setDescription(body.data.message)
      .addFields(
        { name: "Bracket", value: body.data.fromBracketLabel, inline: true },
        {
          name: "TSR",
          value: `${body.data.fromTsr} (${deltaLabel} from your roster)`,
          inline: true,
        },
        { name: "Top roster", value: rosterLines || "—" },
      )
      .setURL(`https://parsertime.app/team/${body.data.fromTeamId}`)
      .setColor(0xf59e0b)
      .setTimestamp();
    await channel.send({ embeds: [embed] });
    return;
  }

  if (body.event === "availability.reminder") {
    const roleId = body.data.roleId ?? null;
    const startUnix = Math.floor(new Date(body.data.weekStart).getTime() / 1000);
    // weekEnd is the exclusive boundary (next Sunday 00:00); show the
    // inclusive last day so the message reads as "… to Saturday" not
    // "… to Sunday".
    const endUnix = Math.floor(
      (new Date(body.data.weekEnd).getTime() - 24 * 60 * 60 * 1000) / 1000,
    );
    const mention = roleId ? `<@&${roleId}> ` : "";
    const content = `${mention}Weekly availability form from <t:${startUnix}:D> to <t:${endUnix}:D> is now available.`;
    const embed = new EmbedBuilder()
      .setTitle(`${body.data.teamName} — set your availability`)
      .setDescription(
        `Fill in your availability for this week:\n${body.data.url}`,
      )
      .setColor(0x10b981)
      .setTimestamp();
    await channel.send({
      content,
      embeds: [embed],
      allowedMentions: roleId ? { roles: [roleId] } : { parse: [] },
    });
    return;
  }

  throw new Error(`Unknown notification event`);
}

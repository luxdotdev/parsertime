import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { sendNotification } from "../api/routes/notifications.ts";
import { apiPost } from "../utils/api.ts";
import { brandEmbed, errorEmbed } from "../utils/embeds.ts";

const PARSERTIME_BASE = (
  process.env.PARSERTIME_API_URL ?? "https://parsertime.app"
).replace(/\/$/, "");

type ReminderJob = {
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

export const data = new SlashCommandBuilder()
  .setName("availability")
  .setDescription("Manage the team availability calendar")
  .addSubcommand((sub) =>
    sub
      .setName("setup")
      .setDescription(
        "Get a private link to the team's availability settings page",
      )
      .addIntegerOption((opt) =>
        opt.setName("team_id").setDescription("Team ID").setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("trigger")
      .setDescription(
        "Post the weekly availability reminder for a team right now",
      )
      .addIntegerOption((opt) =>
        opt.setName("team_id").setDescription("Team ID").setRequired(true),
      ),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const sub = interaction.options.getSubcommand(true);
  const teamId = interaction.options.getInteger("team_id", true);

  if (sub === "setup") {
    const url = `${PARSERTIME_BASE}/team/${teamId}/availability/settings`;
    const embed = brandEmbed("Availability settings").setDescription(
      `Configure the availability calendar for team **${teamId}**:\n${url}\n\nYou'll need to sign in as the team owner or a manager to change settings.`,
    );
    await interaction.reply({
      embeds: [embed],
      flags: [MessageFlags.Ephemeral],
    });
    return;
  }

  if (sub === "trigger") {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const result = await apiPost<ReminderJob>(
      "/api/internal/availability/reminders/trigger",
      { teamId },
      interaction.user.id,
    );

    if (!result.success) {
      await interaction.editReply({ embeds: [errorEmbed(result.error)] });
      return;
    }

    const job = result.data;
    try {
      await sendNotification(interaction.client, {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await interaction.editReply({
        embeds: [errorEmbed(`Failed to post reminder: ${message}`)],
      });
      return;
    }

    const embed = brandEmbed("Reminder posted").setDescription(
      `Posted the weekly availability reminder for **${job.teamName}** in <#${job.channelId}>.\n\nThis does NOT consume the weekly reminder slot — the next scheduled reminder will still fire normally.`,
    );
    await interaction.editReply({ embeds: [embed] });
    return;
  }
}

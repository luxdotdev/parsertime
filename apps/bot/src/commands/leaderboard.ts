import { trace } from "@opentelemetry/api";
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { apiGet } from "../utils/api.ts";
import { brandEmbed, errorEmbed } from "../utils/embeds.ts";
import {
  formatDuration,
  formatNumber,
  medalEmoji,
  padLeft,
  padRight,
} from "../utils/format.ts";
import { tracedDeferReply, tracedEditReply } from "../utils/interaction.ts";

type LeaderboardEntry = {
  player_name: string;
  composite_sr: number;
  rank: number;
  percentile: string;
  maps: number;
  minutes_played: number;
};

type LeaderboardData = {
  hero: string;
  role: string;
  leaderboard: LeaderboardEntry[];
};

export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("View hero leaderboard")
  .addStringOption((opt) =>
    opt.setName("hero").setDescription("Hero name").setRequired(true),
  )
  .addIntegerOption((opt) =>
    opt
      .setName("limit")
      .setDescription("Number of entries (default 10)")
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await tracedDeferReply(interaction);

  const hero = interaction.options.getString("hero", true);
  const limit = interaction.options.getInteger("limit") ?? 10;

  try {
    const result = await apiGet<LeaderboardData>(
      `/api/bot/leaderboard?hero=${encodeURIComponent(hero)}&limit=${limit}`,
    );

    if (!result.success) {
      await tracedEditReply(interaction, {
        embeds: [errorEmbed(result.error)],
      });
      return;
    }

    const { data: lb } = result;

    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes({
        "command.leaderboard.hero": lb.hero,
        "command.leaderboard.role": lb.role,
        "command.leaderboard.entry_count": lb.leaderboard.length,
        "command.leaderboard.entries": JSON.stringify(lb.leaderboard),
        "command.leaderboard.requested_limit": limit,
        "command.leaderboard.api_success": true,
      });
    }

    const embed = brandEmbed(`${lb.hero} Leaderboard · ${lb.role}`);

    if (lb.leaderboard.length === 0) {
      embed.setDescription("No leaderboard data found for this hero.");
      await tracedEditReply(interaction, { embeds: [embed] });
      return;
    }

    // Build monospace table
    const nameWidth = Math.max(
      ...lb.leaderboard.map((e) => e.player_name.length),
      6,
    );
    const header =
      padRight("#", 3) +
      padRight("Player", nameWidth + 1) +
      padLeft("CSR", 7) +
      padLeft("Maps", 6) +
      padLeft("Time", 8);
    const separator = "─".repeat(header.length);

    const rows = lb.leaderboard.map((entry) => {
      const timePlayed = formatDuration(entry.minutes_played * 60);
      return (
        padRight(String(entry.rank), 3) +
        padRight(entry.player_name, nameWidth + 1) +
        padLeft(formatNumber(entry.composite_sr), 7) +
        padLeft(String(entry.maps), 6) +
        padLeft(timePlayed, 8)
      );
    });

    const table = "```\n" + [header, separator, ...rows].join("\n") + "\n```";
    embed.setDescription(table);

    // Medal highlights for top 3
    const top3 = lb.leaderboard.filter((e) => e.rank <= 3);
    if (top3.length > 0) {
      const highlights = top3
        .map(
          (e) =>
            `${medalEmoji(e.rank)} ${e.player_name} · ${formatNumber(e.composite_sr)} CSR · Top ${e.percentile}%`,
        )
        .join("\n");
      embed.addFields({
        name: "Top Players",
        value: highlights,
        inline: false,
      });
    }

    await tracedEditReply(interaction, { embeds: [embed] });
  } catch (error) {
    if (interaction.deferred || interaction.replied) {
      await tracedEditReply(interaction, {
        embeds: [errorEmbed("Something went wrong. Try again later.")],
      });
    }
    throw error;
  }
}

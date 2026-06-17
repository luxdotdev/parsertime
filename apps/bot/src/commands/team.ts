import { trace } from "@opentelemetry/api";
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { apiGet } from "../utils/api.ts";
import { BRAND_COLOR, brandEmbed, errorEmbed } from "../utils/embeds.ts";
import { padLeft, padRight, statBar } from "../utils/format.ts";
import { tracedDeferReply, tracedEditReply } from "../utils/interaction.ts";

type MapWinrate = {
  totalWins: number;
  totalLosses: number;
  totalWinrate: number;
};

type TeamData = {
  team: { name: string; memberCount: number };
  winrates: {
    overallWins: number;
    overallLosses: number;
    overallWinrate: number;
    byMap: Record<string, MapWinrate>;
  };
};

const COLOR_GREEN = 0x22c55e;
const COLOR_RED = 0xef4444;

export const data = new SlashCommandBuilder()
  .setName("team")
  .setDescription("View team winrates and stats")
  .addIntegerOption((opt) =>
    opt.setName("team_id").setDescription("Team ID").setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await tracedDeferReply(interaction);

  const teamId = interaction.options.getInteger("team_id", true);

  try {
    const result = await apiGet<TeamData>(
      `/api/bot/team?teamId=${teamId}`,
      interaction.user.id,
    );

    if (!result.success) {
      await tracedEditReply(interaction, {
        embeds: [errorEmbed(result.error)],
      });
      return;
    }

    const { team, winrates } = result.data;

    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes({
        "command.team.team_id": teamId,
        "command.team.team_name": team.name,
        "command.team.member_count": team.memberCount,
        "command.team.overall_wins": winrates.overallWins,
        "command.team.overall_losses": winrates.overallLosses,
        "command.team.overall_winrate": winrates.overallWinrate,
        "command.team.map_count": Object.keys(winrates.byMap).length,
        "command.team.by_map": JSON.stringify(winrates.byMap),
        "command.team.api_success": true,
      });
    }

    const wr = winrates.overallWinrate;
    const totalMaps = winrates.overallWins + winrates.overallLosses;

    // Dynamic color based on winrate
    const embedColor =
      wr > 55 ? COLOR_GREEN : wr < 45 ? COLOR_RED : BRAND_COLOR;

    const embed = brandEmbed(team.name)
      .setColor(embedColor)
      .setDescription(`${team.memberCount} members · ${totalMaps} maps played`);

    // Overall record with bar
    const bar = statBar(wr / 100);
    embed.addFields({
      name: "Overall Record",
      value: `**${winrates.overallWins}W - ${winrates.overallLosses}L** (${wr}%)\n${bar} ${Math.round(wr)}%`,
      inline: false,
    });

    // Map breakdown as code block table
    const mapEntries = Object.entries(winrates.byMap);
    if (mapEntries.length > 0) {
      const sorted = mapEntries.sort(
        (a, b) => b[1].totalWinrate - a[1].totalWinrate,
      );

      const mapNameWidth = Math.max(...sorted.map(([name]) => name.length), 3);
      const header =
        padRight("Map", mapNameWidth + 1) +
        padLeft("W", 4) +
        padLeft("L", 4) +
        padLeft("WR%", 7);
      const separator = "─".repeat(header.length);

      const rows = sorted.map(
        ([map, data]) =>
          padRight(map, mapNameWidth + 1) +
          padLeft(String(data.totalWins), 4) +
          padLeft(String(data.totalLosses), 4) +
          padLeft(`${data.totalWinrate.toFixed(1)}%`, 7),
      );

      const table = "```\n" + [header, separator, ...rows].join("\n") + "\n```";
      embed.addFields({
        name: "Map Breakdown",
        value: table,
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

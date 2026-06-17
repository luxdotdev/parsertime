import { trace } from "@opentelemetry/api";
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { apiGet } from "../utils/api.ts";
import { brandEmbed, errorEmbed } from "../utils/embeds.ts";
import {
  formatNumber,
  formatStatName,
  padLeft,
  padRight,
} from "../utils/format.ts";
import { tracedDeferReply, tracedEditReply } from "../utils/interaction.ts";

type PlayerCompareData = {
  playerName: string;
  mapCount: number;
  aggregated: Record<string, number>;
};

type CompareData = {
  player1: PlayerCompareData;
  player2: PlayerCompareData;
};

const COMPARE_STATS = [
  "eliminationsPer10",
  "finalBlowsPer10",
  "deathsPer10",
  "heroDamagePer10",
  "healingDealtPer10",
  "damageTakenPer10",
  "damageBlockedPer10",
  "ultimatesEarnedPer10",
] as const;

// Stats where lower is better
const LOWER_IS_BETTER = new Set(["deathsPer10", "damageTakenPer10"]);

export const data = new SlashCommandBuilder()
  .setName("compare")
  .setDescription("Compare two players")
  .addStringOption((opt) =>
    opt
      .setName("player1")
      .setDescription("First player name")
      .setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName("player2")
      .setDescription("Second player name")
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await tracedDeferReply(interaction);

  const player1 = interaction.options.getString("player1", true);
  const player2 = interaction.options.getString("player2", true);

  try {
    const result = await apiGet<CompareData>(
      `/api/bot/compare?player1=${encodeURIComponent(player1)}&player2=${encodeURIComponent(player2)}`,
    );

    if (!result.success) {
      await tracedEditReply(interaction, {
        embeds: [errorEmbed(result.error)],
      });
      return;
    }

    const { player1: p1, player2: p2 } = result.data;

    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes({
        "command.compare.player1_name": p1.playerName,
        "command.compare.player1_map_count": p1.mapCount,
        "command.compare.player1_aggregated": JSON.stringify(p1.aggregated),
        "command.compare.player2_name": p2.playerName,
        "command.compare.player2_map_count": p2.mapCount,
        "command.compare.player2_aggregated": JSON.stringify(p2.aggregated),
        "command.compare.api_success": true,
      });
    }

    const a1 = p1.aggregated ?? {};
    const a2 = p2.aggregated ?? {};

    // Truncate names for column headers (max 12 chars)
    const n1 = p1.playerName.slice(0, 12);
    const n2 = p2.playerName.slice(0, 12);

    const statNameWidth = 18;
    const colWidth = Math.max(n1.length, n2.length, 8);

    const headerLine =
      padRight("", statNameWidth) +
      padLeft(n1, colWidth) +
      "  " +
      padLeft(n2, colWidth);

    const rows: string[] = [headerLine];

    for (const key of COMPARE_STATS) {
      const v1 = a1[key];
      const v2 = a2[key];
      if (v1 == null && v2 == null) continue;

      const s1 = v1 != null ? formatNumber(v1) : "—";
      const s2 = v2 != null ? formatNumber(v2) : "—";

      let arrow = "  ";
      if (v1 != null && v2 != null) {
        const lowerBetter = LOWER_IS_BETTER.has(key);
        if (lowerBetter) {
          arrow = v1 < v2 ? "◄ " : v1 > v2 ? " ►" : "  ";
        } else {
          arrow = v1 > v2 ? "◄ " : v1 < v2 ? " ►" : "  ";
        }
      }

      rows.push(
        padRight(formatStatName(key), statNameWidth) +
          padLeft(s1, colWidth) +
          "  " +
          padLeft(s2, colWidth) +
          "  " +
          arrow,
      );
    }

    const table = "```\n" + rows.join("\n") + "\n```";

    const embed = brandEmbed(`${p1.playerName} vs ${p2.playerName}`)
      .setDescription(`${p1.mapCount} maps · ${p2.mapCount} maps`)
      .addFields({ name: "Stats", value: table, inline: false })
      .setFooter({
        text: `◄ ${n1} leads · ► ${n2} leads · Parsertime`,
        iconURL: "https://parsertime.app/icon.png",
      });

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

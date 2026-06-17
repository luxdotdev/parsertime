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
  formatStatName,
  trendArrow,
} from "../utils/format.ts";
import { tracedDeferReply, tracedEditReply } from "../utils/interaction.ts";

type TrendMetric = {
  metric: string;
  change: number;
  changePercentage: number;
};

type ProfileData = {
  playerName: string;
  mapCount: number;
  heroesPlayed: string[];
  aggregated: Record<string, number>;
  trends: {
    improvingMetrics: TrendMetric[];
    decliningMetrics: TrendMetric[];
  };
};

const COMBAT_STATS = [
  "eliminationsPer10",
  "finalBlowsPer10",
  "deathsPer10",
] as const;

const DAMAGE_HEALING_STATS = [
  "heroDamagePer10",
  "healingDealtPer10",
  "damageTakenPer10",
  "damageBlockedPer10",
] as const;

const ULT_STATS = ["ultimatesEarnedPer10"] as const;

export const data = new SlashCommandBuilder()
  .setName("profile")
  .setDescription("View a player profile with aggregated stats")
  .addStringOption((opt) =>
    opt
      .setName("player")
      .setDescription("In-game player name")
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await tracedDeferReply(interaction);

  const playerName = interaction.options.getString("player", true);

  try {
    const result = await apiGet<ProfileData>(
      `/api/bot/profile?playerName=${encodeURIComponent(playerName)}`,
    );

    if (!result.success) {
      await tracedEditReply(interaction, {
        embeds: [errorEmbed(result.error)],
      });
      return;
    }

    const {
      playerName: name,
      mapCount,
      heroesPlayed,
      aggregated,
      trends,
    } = result.data;

    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes({
        "command.profile.player_name": name,
        "command.profile.map_count": mapCount,
        "command.profile.heroes_played": heroesPlayed.join(", "),
        "command.profile.heroes_count": heroesPlayed.length,
        "command.profile.aggregated": JSON.stringify(aggregated),
        "command.profile.trends": JSON.stringify(trends),
        "command.profile.api_success": true,
      });
    }

    const stats = aggregated ?? {};
    const playtime = stats.heroTimePlayed
      ? formatDuration(stats.heroTimePlayed)
      : null;

    const descParts = [
      `${mapCount} maps played`,
      `${heroesPlayed.length} heroes`,
    ];
    if (playtime) descParts.push(`${playtime} playtime`);

    const embed = brandEmbed(name).setDescription(descParts.join(" · "));

    // Heroes field
    embed.addFields({
      name: "Heroes",
      value: heroesPlayed.map((h) => `\`${h}\``).join(" ") || "None",
      inline: false,
    });

    // Combat field
    const combatLines = COMBAT_STATS.filter((k) => stats[k] != null)
      .map((k) => `${formatStatName(k)} **${formatNumber(stats[k])}**`)
      .join(" · ");
    if (combatLines) {
      embed.addFields({ name: "Combat", value: combatLines, inline: false });
    }

    // Damage & Healing field
    const dmgHealLines = DAMAGE_HEALING_STATS.filter(
      (k) => stats[k] != null,
    ).map((k) => `${formatStatName(k)} **${formatNumber(stats[k])}**`);
    if (dmgHealLines.length > 0) {
      // Split into two rows of two for readability
      const mid = Math.ceil(dmgHealLines.length / 2);
      const value = [
        dmgHealLines.slice(0, mid).join(" · "),
        dmgHealLines.slice(mid).join(" · "),
      ]
        .filter(Boolean)
        .join("\n");
      embed.addFields({
        name: "Damage & Healing",
        value,
        inline: false,
      });
    }

    // Ultimates field
    const ultLines = ULT_STATS.filter((k) => stats[k] != null)
      .map((k) => `${formatStatName(k)} **${formatNumber(stats[k])}**`)
      .join(" · ");
    if (ultLines) {
      embed.addFields({ name: "Ultimates", value: ultLines, inline: false });
    }

    // Trends field
    const trendLines: string[] = [];
    if (trends?.improvingMetrics) {
      for (const m of trends.improvingMetrics.slice(0, 3)) {
        trendLines.push(
          `${trendArrow(m.changePercentage)} ${m.metric} (${m.changePercentage >= 0 ? "+" : ""}${m.changePercentage.toFixed(1)}%)`,
        );
      }
    }
    if (trends?.decliningMetrics) {
      for (const m of trends.decliningMetrics.slice(0, 3)) {
        trendLines.push(
          `${trendArrow(-1)} ${m.metric} (+${Math.abs(m.changePercentage).toFixed(1)}%)`,
        );
      }
    }
    if (trendLines.length > 0) {
      embed.addFields({
        name: "Trends",
        value: trendLines.join("\n"),
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

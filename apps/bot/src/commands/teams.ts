import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { apiGet } from "../utils/api.ts";
import { brandEmbed, errorEmbed } from "../utils/embeds.ts";
import { padLeft, padRight } from "../utils/format.ts";
import { tracedDeferReply, tracedEditReply } from "../utils/interaction.ts";

type TeamEntry = {
  id: number;
  name: string;
  role: "owner" | "manager" | "member";
};

type TeamsResponse = {
  teams: TeamEntry[];
};

const NAME_COL_MAX = 32;

export const data = new SlashCommandBuilder()
  .setName("teams")
  .setDescription("List your Parsertime teams and their IDs");

export async function execute(interaction: ChatInputCommandInteraction) {
  await tracedDeferReply(interaction, { flags: [MessageFlags.Ephemeral] });

  const result = await apiGet<TeamsResponse>(
    "/api/bot/teams",
    interaction.user.id,
  );

  if (!result.success) {
    await tracedEditReply(interaction, {
      embeds: [errorEmbed(result.error)],
    });
    return;
  }

  const { teams } = result.data;

  if (teams.length === 0) {
    await tracedEditReply(interaction, {
      embeds: [
        brandEmbed("Your teams").setDescription(
          "You're not a member of any teams yet.",
        ),
      ],
    });
    return;
  }

  const idWidth = Math.max(
    2,
    ...teams.map((t) => String(t.id).length),
  );
  const nameWidth = Math.min(
    NAME_COL_MAX,
    Math.max(4, ...teams.map((t) => t.name.length)),
  );
  const roleWidth = Math.max(
    4,
    ...teams.map((t) => t.role.length),
  );

  const header =
    padLeft("ID", idWidth) +
    "  " +
    padRight("Name", nameWidth) +
    "  " +
    padRight("Role", roleWidth);
  const separator = "─".repeat(header.length);
  const rows = teams.map(
    (t) =>
      padLeft(String(t.id), idWidth) +
      "  " +
      padRight(t.name, nameWidth) +
      "  " +
      padRight(t.role, roleWidth),
  );
  const table = "```\n" + [header, separator, ...rows].join("\n") + "\n```";

  const embed = brandEmbed("Your teams")
    .setDescription(
      `${teams.length} team${teams.length === 1 ? "" : "s"}`,
    )
    .addFields({ name: "Teams", value: table, inline: false });

  await tracedEditReply(interaction, { embeds: [embed] });
}

import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { brandEmbed } from "../utils/embeds.ts";

type CommandEntry = {
  usage: string;
  description: string;
};

type CommandCategory = {
  name: string;
  commands: CommandEntry[];
};

const CATEGORIES: CommandCategory[] = [
  {
    name: "Stats",
    commands: [
      {
        usage: "/profile player_name:<name>",
        description: "Aggregated stats, trends, and heroes for a player.",
      },
      {
        usage: "/leaderboard hero:<hero>",
        description: "Top players on a hero by average stats.",
      },
      {
        usage: "/compare player1:<name> player2:<name>",
        description: "Side-by-side comparison of two players.",
      },
      {
        usage: "/team team_id:<id>",
        description: "Team winrates overall and by map.",
      },
    ],
  },
  {
    name: "Teams",
    commands: [
      {
        usage: "/teams",
        description: "List your Parsertime teams and their IDs.",
      },
      {
        usage: "/availability setup team_id:<id>",
        description:
          "Private link to the availability settings page for a team.",
      },
      {
        usage: "/availability trigger team_id:<id>",
        description:
          "Post the weekly availability reminder right now (does not consume the scheduled firing).",
      },
    ],
  },
  {
    name: "Utility",
    commands: [
      {
        usage: "/help",
        description: "Show this help message.",
      },
    ],
  },
];

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("List everything the Parsertime bot can do");

export async function execute(interaction: ChatInputCommandInteraction) {
  const embed = brandEmbed("Parsertime bot — commands").setDescription(
    "Bot-linked actions require linking your Discord account at parsertime.app/settings.",
  );

  for (const category of CATEGORIES) {
    const lines = category.commands.map(
      (cmd) => `\`${cmd.usage}\`\n${cmd.description}`,
    );
    embed.addFields({
      name: category.name,
      value: lines.join("\n\n"),
      inline: false,
    });
  }

  await interaction.reply({
    embeds: [embed],
    flags: [MessageFlags.Ephemeral],
  });
}

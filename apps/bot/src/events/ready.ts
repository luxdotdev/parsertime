import { type Client, Events, REST, Routes } from "discord.js";
import * as availability from "../commands/availability.ts";
import * as compare from "../commands/compare.ts";
import * as help from "../commands/help.ts";
import * as leaderboard from "../commands/leaderboard.ts";
import * as profile from "../commands/profile.ts";
import * as team from "../commands/team.ts";
import * as teams from "../commands/teams.ts";
import { logger } from "../utils/logger.ts";

const commands = [
  leaderboard,
  team,
  profile,
  compare,
  availability,
  teams,
  help,
];

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: Client<true>) {
  const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
  const body = commands.map((cmd) => cmd.data.toJSON());
  const devGuildId = process.env.DEV_GUILD_ID;

  if (devGuildId) {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, devGuildId),
      { body },
    );
  } else {
    await rest.put(Routes.applicationCommands(client.user.id), { body });
  }

  logger.info({
    type: "bot_ready",
    bot_tag: client.user.tag,
    commands_registered: body.length,
    registration_scope: devGuildId ? "guild" : "global",
    dev_guild_id: devGuildId ?? null,
  });
}

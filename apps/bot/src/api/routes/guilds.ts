import {
  ChannelType,
  DiscordAPIError,
  RESTJSONErrorCodes,
  type Client,
  type Guild,
} from "discord.js";

async function isUserInGuild(guild: Guild, userId: string): Promise<boolean> {
  try {
    await guild.members.fetch({ user: userId, force: false });
    return true;
  } catch (err) {
    if (
      err instanceof DiscordAPIError &&
      err.code === RESTJSONErrorCodes.UnknownMember
    ) {
      return false;
    }
    throw err;
  }
}

export async function getGuildsForUser(client: Client, userId: string) {
  const guilds = [...client.guilds.cache.values()];
  const checks = await Promise.all(
    guilds.map(async (g) => ({
      guild: g,
      isMember: await isUserInGuild(g, userId),
    })),
  );
  return checks
    .filter((c) => c.isMember)
    .map(({ guild }) => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
    }));
}

export async function getGuildChannelsForUser(
  client: Client,
  guildId: string,
  userId: string,
) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return null;
  if (!(await isUserInGuild(guild, userId))) return null;
  return guild.channels.cache
    .filter((c) => c.type === ChannelType.GuildText)
    .map((c) => ({ id: c.id, name: c.name, type: c.type }));
}

export async function isUserGuildMember(
  client: Client,
  guildId: string,
  userId: string,
): Promise<boolean> {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return false;
  return isUserInGuild(guild, userId);
}

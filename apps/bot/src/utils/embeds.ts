import { EmbedBuilder } from "discord.js";

export const BRAND_COLOR = 0x0ea5e9;
const ERROR_COLOR = 0xef4444;

export function errorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(ERROR_COLOR).setDescription(message);
}

export function brandEmbed(title: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(title)
    .setFooter({ text: "Parsertime", iconURL: "https://parsertime.app/icon.png" })
    .setTimestamp();
}

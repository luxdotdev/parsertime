import Logger from "@/lib/logger";
import { kv } from "@vercel/kv";
import { nanoid } from "nanoid";

export async function createShortLink(url: string) {
  const shortLink = nanoid(10);

  try {
    Logger.log(`Creating short link for ${url} at ${shortLink}`);
    await kv.set(`link/${shortLink}`, url);
  } catch (err) {
    Logger.error(err);
    return url;
  }

  return `https://parserti.me/${shortLink}`;
}

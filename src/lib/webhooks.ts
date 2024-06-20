import Logger from "@/lib/logger";
import { $Enums } from "@prisma/client";
import { User } from "next-auth";

/**
 * The structure of a Discord webhook. This is a simplified version of the actual
 * structure, which can be found at https://discord.com/developers/docs/resources/webhook#execute-webhook.
 * This structure only includes the fields that are used in this application.
 */
type DiscordWebhook = {
  username?: string;
  avatar_url?: string;
  content?: string;
  embeds: {
    title?: string;
    description?: string;
    url?: string;
    timestamp?: Date;
    color?: number;
    thumbnail?: {
      url?: string;
    };
    footer?: {
      text?: string;
      icon_url?: string;
    };
  }[];
};

/**
 * Construct a new user webhook.
 *
 * @param {User} user - The user that was created.
 * @returns {DiscordWebhook} The constructed webhook.
 */
export function newUserWebhookConstructor(user: User): DiscordWebhook {
  return {
    username: "Parsertime",
    avatar_url: "https://parsertime.app/icon.png",
    embeds: [
      {
        title: "New User",
        description: `New user registered: ${user.name} (${user.email})`,
        timestamp: new Date(),
        color: 0x0ea5e9,
        thumbnail: {
          url: user.image ?? `https://avatar.vercel.sh/${user.email}.png`,
        },
        footer: {
          text: "Parsertime",
          icon_url: "https://parsertime.app/icon.png",
        },
      },
    ],
  };
}

/**
 * Construct a delete user webhook.
 *
 * @param {User} user - The user that was created.
 * @returns {DiscordWebhook} The constructed webhook.
 */
export function deleteUserWebhookConstructor(user: User): DiscordWebhook {
  return {
    username: "Parsertime",
    avatar_url: "https://parsertime.app/icon.png",
    embeds: [
      {
        title: "User Deleted",
        description: `User deleted: ${user.name} (${user.email})`,
        timestamp: new Date(),
        color: 0x0ea5e9,
        thumbnail: {
          url: user.image ?? `https://avatar.vercel.sh/${user.email}.png`,
        },
        footer: {
          text: "Parsertime",
          icon_url: "https://parsertime.app/icon.png",
        },
      },
    ],
  };
}

export function newBugReportWebhookConstructor(
  title: string,
  description: string,
  email: string,
  url: string,
  subscription: string,
  ua: string,
  browser: {
    name?: string;
    version?: string;
  },
  os: {
    name?: string;
    version?: string;
  },
  device: {
    model?: string;
    type?: string;
    vendor?: string;
  }
): DiscordWebhook {
  return {
    username: "Parsertime",
    avatar_url: "https://parsertime.app/icon.png",
    content:
      subscription === $Enums.BillingPlan.PREMIUM
        ? `<@&${process.env.BUG_REPORT_NOTIFICATIONS_ROLE_ID}> Priority Bug Report`
        : undefined,
    embeds: [
      {
        title: `‼️ New Bug Report`,
        description: `
        # ${title}

        ### **Description:** 
        ${description}

        **Details:**
        > **User:** \`${email}\`
        > **URL:** \`${url}\`
        > **Subscription:** \`${subscription}\`

        **User Agent:** 
        > **UA**: \`${ua}\`
        > **Browser:** \`${browser.name} ${browser.version}\`
        > **OS:** \`${os.name} ${os.version}\`
        > **Device:** \`${device.vendor ?? ""} ${device.model ?? ""} ${device.type ?? ""}\`
        `,
        timestamp: new Date(),
        color: 0xff0000,
        footer: {
          text: "Parsertime",
          icon_url: "https://parsertime.app/icon.png",
        },
      },
    ],
  };
}

/**
 * Send a message to a Discord webhook.
 *
 * @param {string} url - The URL of the webhook to send the message to.
 * @param {DiscordWebhook} data - The message to send.
 */
export async function sendDiscordWebhook(url: string, data: DiscordWebhook) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    Logger.error("Failed to send Discord webhook", {
      status: response.status,
      statusText: response.statusText,
      url,
      data,
    });
    throw new Error("Failed to send Discord webhook");
  }
}

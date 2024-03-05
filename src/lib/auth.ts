import { PrismaAdapter } from "@auth/prisma-adapter";
import { $Enums } from "@prisma/client";
import GithubProvider from "next-auth/providers/github";
import DiscordProvider from "next-auth/providers/discord";
import GoogleProvider from "next-auth/providers/google";
import NextAuth, { NextAuthConfig } from "next-auth";
import isEmail from "validator/lib/isEmail";
import { render } from "@react-email/render";
import MagicLinkEmail from "@/components/email/magic-link";
import prisma from "@/lib/prisma";
import { track } from "@vercel/analytics/server";
import Logger from "@/lib/logger";
import { getUser } from "@/data/user-dto";
import { get } from "@vercel/edge-config";
import { createHash, randomBytes } from "crypto";
import { newUserWebhookConstructor, sendDiscordWebhook } from "@/lib/webhooks";
import { stripe } from "@/lib/stripe";
import sendgrid from "@sendgrid/mail";

export type Availability = "public" | "private";

sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

export const config = {
  adapter: PrismaAdapter(prisma),
  // Configure one or more authentication providers
  providers: [
    // Providers without credentials are configured by default
    // OAuth authentication providers
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    {
      id: "email",
      type: "email",
      name: "Email",
      from: "",
      server: "",
      maxAge: 60 * 10,
      options: {},
      async sendVerificationRequest({ identifier: email, url }) {
        if (!isEmail(email)) {
          throw new Error("Invalid email address");
        }

        const emailHtml = render(
          MagicLinkEmail({ magicLink: url, username: email })
        );

        try {
          await sendgrid.send({
            to: email,
            from: "noreply@lux.dev",
            subject: "Sign in to Parsertime",
            html: emailHtml,
          });
        } catch (e) {
          Logger.error("Error sending email", e);
          throw new Error("Error sending email");
        }

        await track("Email Sent", { type: "Magic Link" });
      },
    },
  ],
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      if (!user.email) return false;

      // get app availability from edge config
      const status = (await get("availability")) as Availability;

      if (status === "public") return true;

      // get list of allowed user emails from edge config
      const allowedUsers = (await get("allowedUsers")) as string[];

      if (allowedUsers.includes(user.email)) return true;

      Logger.log("User not authorized for private access", { user });
      return false;
    },
    async redirect({ baseUrl }) {
      return `${baseUrl}/dashboard`;
    },
  },
  events: {
    async signIn({ user, isNewUser }) {
      if (isNewUser) {
        // Log new user signups
        Logger.log("New user signed up", { user });

        // Send a Discord webhook for new user signups
        const wh = newUserWebhookConstructor(user);
        await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, wh);

        // Track new user signups with Vercel Analytics
        await track("New User", { email: user.email ?? "unknown" });
      }
    },
    async createUser({ user }) {
      const customer = await stripe.customers.create({
        email: user.email!,
        name: user.name ?? undefined,
      });

      const updatedUser = await prisma.user.update({
        where: {
          email: user.email!,
        },
        data: {
          stripeId: customer.id,
        },
      });

      Logger.log("Stripe customer created", { updatedUser });
    },
  },
  pages: {
    signIn: "/sign-in",
    error: "/auth-error",
    verifyRequest: "/verify-request",
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);

export async function isAuthedToViewScrim(id: number) {
  const session = await auth();
  if (!session) {
    return false;
  }

  const user = await getUser(session?.user?.email);

  // if user is admin return true
  if (user?.role === $Enums.UserRole.ADMIN) {
    return true;
  }

  const listOfViewableScrims = await prisma.scrim.findMany({
    where: {
      OR: [
        {
          creatorId: user?.id,
        },
        {
          Team: {
            users: {
              some: {
                id: user?.id,
              },
            },
          },
        },
      ],
    },
  });

  if (listOfViewableScrims.some((scrim) => scrim.id === id)) {
    return true;
  }

  // if user is correctly authed return true
  return true;
}

export async function isAuthedToViewTeam(id: number) {
  const session = await auth();
  if (!session) {
    return false;
  }

  const user = await prisma.user.findFirst({
    where: {
      email: session?.user?.email,
    },
  });

  if (!user) {
    return false;
  }

  if (user.role === $Enums.UserRole.ADMIN) {
    return true;
  }

  const teamMembersById = await prisma.team.findFirst({
    where: {
      id: id,
    },
    select: {
      users: true,
    },
  });

  if (teamMembersById?.users?.some((u) => u.id === user.id)) {
    return true;
  } else {
    return false;
  }
}

/**
 * Allows an admin to impersonate another user by generating a token and a callback URL.
 * This URL can be used to sign in as the user. Please use this feature responsibly.
 *
 * @param email {string} - The email of the user to impersonate
 * @returns {Promise<string>} The callback URL
 */
export async function getImpersonateUrl(email: string, isProd = true) {
  const callbackUrl = isProd
    ? "https://parsertime.app"
    : "http://localhost:3000";

  const token = randomBytes(32).toString("hex");

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashToken(token),
      expires: new Date(Date.now() + 60000),
    },
  });

  const params = new URLSearchParams({
    callbackUrl,
    email,
    token,
  });

  Logger.log(
    "Impersonation URL generated for user: ",
    { email },
    `${callbackUrl}/api/auth/callback/email?${params}`
  );

  return `${callbackUrl}/api/auth/callback/email?${params}`;
}

/**
 * Hashes a token using SHA256 and a secret.
 *
 * @param token {string} - The token to hash
 * @param options {object} - Options
 * @param options.noSecret {boolean} - If true, the secret will not be added to the token
 * @returns {string} The hashed token
 */
export function hashToken(
  token: string,
  {
    noSecret = false,
  }: {
    noSecret?: boolean;
  } = {}
) {
  return createHash("sha256")
    .update(`${token}${noSecret ? "" : process.env.NEXTAUTH_SECRET}`)
    .digest("hex");
}

import MagicLinkEmail from "@/components/email/magic-link";
import UserOnboardingEmail from "@/components/email/onboarding";
import { getScrim, getUserViewableScrims } from "@/data/scrim-dto";
import { getUser } from "@/data/user-dto";
import { email } from "@/lib/email";
import { createShortLink } from "@/lib/link-service";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { isTaggedError } from "@/lib/utils";
import {
  newSuspiciousActivityWebhookConstructor,
  newUserWebhookConstructor,
  sendDiscordWebhook,
} from "@/lib/webhooks";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { $Enums, type User } from "@prisma/client";
import { render } from "@react-email/render";
import { Ratelimit } from "@upstash/ratelimit";
import { track } from "@vercel/analytics/server";
import { get } from "@vercel/edge-config";
import { kv } from "@vercel/kv";
import { createHash, randomBytes } from "crypto";
import NextAuth, { type NextAuthConfig } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import isEmail from "validator/lib/isEmail";

const isProd = process.env.NODE_ENV === "production";
const isPreview = process.env.VERCEL_ENV === "preview";

export type Availability = "public" | "private";

function handleEmailError(error: unknown) {
  if (isTaggedError(error)) {
    switch (error._tag) {
      case "ValidationError":
        throw new Error("Invalid email arguments");
      case "ConfigurationError":
        throw new Error(
          "Configuration error with email service. Please contact support."
        );
      case "RateLimitError":
        throw new Error(
          "Rate limit exceeded for sending email. Try again later."
        );
      case "EmailSendError":
        throw new Error(
          "Error sending email with email service. Please contact support."
        );
      default:
        throw new Error("Unknown error sending email. Please contact support.");
    }
  } else {
    throw new Error("Unknown error sending email");
  }
}

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
      async sendVerificationRequest({ identifier: userEmail, url }) {
        if (!isEmail(userEmail)) {
          throw new Error("Invalid email address");
        }

        const shortLink = await createShortLink(url);

        const emailHtml = await render(
          MagicLinkEmail({ magicLink: shortLink, username: userEmail })
        );

        try {
          await email.sendEmail({
            to: userEmail,
            from: "noreply@lux.dev",
            subject: "Sign in to Parsertime",
            html: emailHtml,
          });
        } catch (error) {
          handleEmailError(error);
        }

        await track("Email Sent", { type: "Magic Link" });
      },
    },
  ],
  callbacks: {
    async signIn({ user }) {
      if (!isProd) return true; // allow all sign ins in dev

      if (!user.email) return false;

      // deny all blocked users
      const blockedUsers = (await get<string[]>("blockedUsers")) ?? [];
      if (blockedUsers.includes(user.email)) {
        Logger.log("User blocked", { user });
        return false;
      }

      // get app availability from edge config
      const status = (await get<Availability>("availability")) ?? "private";

      if (status === "public" && !isPreview) return true;

      // get list of allowed user emails from edge config
      const allowedUsers = (await get<string[]>("allowedUsers")) ?? [];

      // allow all lux.dev emails
      if (user.email.includes("lux.dev")) return true;
      if (allowedUsers.includes(user.email)) return true;

      Logger.log("User not authorized for private access", { user });
      return false;
    },
    redirect({ baseUrl }) {
      return `${baseUrl}/dashboard`;
    },
  },
  events: {
    async signIn({ user, isNewUser }) {
      const ratelimit = new Ratelimit({
        redis: kv,
        limiter: Ratelimit.slidingWindow(5, "1 m"),
        analytics: true,
      });

      const identifier = user.email ?? "unknown";
      const { success } = await ratelimit.limit(identifier);

      if (!success) {
        Logger.log("Rate limit exceeded for sign in attempt", identifier);

        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const userObj = {
          name: user.name ?? "Unknown",
          email: user.email ?? "unknown",
          id: user.id ?? "unknown",
        } as User;

        const wh = newSuspiciousActivityWebhookConstructor(
          userObj,
          "Sign in (rate limit exceeded)",
          "",
          { name: "", version: "" },
          { name: "", version: "" },
          {}
        );
        await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, wh);

        throw new Error("Rate limit exceeded");
      }

      if (isNewUser) {
        // Log new user signups
        Logger.log("New user signed up", { user });

        // Send a Discord webhook for new user signups
        const wh = newUserWebhookConstructor(user);
        await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, wh);

        // Track new user signups with Vercel Analytics
        await track("New User", { email: user.email ?? "unknown" });

        const emailHtml = await render(
          UserOnboardingEmail({ name: user.name ?? "user", email: user.email! })
        );

        try {
          await email.sendEmail({
            to: user.email!,
            from: "noreply@lux.dev",
            subject: `Welcome to Parsertime!`,
            html: emailHtml,
          });
        } catch (error) {
          handleEmailError(error);
        }
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

  const user = await getUser(session?.user?.email);

  // if user is admin return true
  if (user !== null && user?.role === $Enums.UserRole.ADMIN) {
    return true;
  }

  const scrim = await getScrim(id);
  if (!scrim) return false;

  if (scrim.guestMode) return true;

  if (!session) {
    return false;
  }

  if (!user) return false;

  const listOfViewableScrims = await getUserViewableScrims(user.id);

  if (listOfViewableScrims.some((scrim) => scrim.id === id)) {
    return true;
  }

  // Return false if the user fails all checks:
  // - not an admin
  // - not in the list of viewable scrims
  // - scrim is not in guest mode
  return false;
}

export async function isAuthedToViewMap(scrimId: number, mapId: number) {
  const session = await auth();

  const user = await getUser(session?.user?.email);

  // if user is admin return true
  if (user !== null && user?.role === $Enums.UserRole.ADMIN) {
    return true;
  }

  const scrim = await getScrim(scrimId);
  if (!scrim) return false;

  const scrimMaps = await prisma.map.findMany({
    where: {
      scrimId,
    },
  });

  if (!scrimMaps) return false;

  const map = scrimMaps.find((m) => m.id === mapId);

  if (!map) return false;

  if (scrim.guestMode) return true;

  if (!session) {
    return false;
  }

  if (!user) return false;

  return true;
}

export async function isAuthedToViewTeam(id: number) {
  const session = await auth();
  if (!session) {
    return false;
  }

  const user = await getUser(session?.user?.email);

  if (!user) {
    return false;
  }

  if (user.role === $Enums.UserRole.ADMIN) {
    return true;
  }

  const teamMembersById = await prisma.team.findFirst({
    where: { id },
    select: {
      users: true,
    },
  });

  if (teamMembersById?.users?.some((u) => u.id === user.id)) {
    return true;
  }
  return false;
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
    `${callbackUrl}/api/auth/callback/email?${params.toString()}`
  );

  return `${callbackUrl}/api/auth/callback/email?${params.toString()}`;
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

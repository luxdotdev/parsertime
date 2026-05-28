import MagicLinkEmail from "@/components/email/magic-link";
import UserOnboardingEmail from "@/components/email/onboarding";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import {
  authNewUserCounter,
  authSignInCounter,
  rateLimitHitCounter,
} from "@/lib/axiom/metrics";
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
import { Effect } from "effect";
import NextAuth, { type NextAuthConfig } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import FaceitProvider from "next-auth/providers/faceit";
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
    FaceitProvider({
      clientId: process.env.FACEIT_CLIENT_ID,
      clientSecret: process.env.FACEIT_CLIENT_SECRET,
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
        Logger.warn(`User sign-in blocked: ${user.email}`);
        return false;
      }

      // get app availability from edge config
      const status = (await get<Availability>("availability")) ?? "private";

      if (status === "public" && !isPreview) return true;

      // get list of allowed user emails from edge config
      const allowedUsers = (await get<string[]>("allowedUsers")) ?? [];

      // allow all lux.dev emails
      if (user.email.toLowerCase().endsWith("@lux.dev")) return true;
      if (allowedUsers.includes(user.email)) return true;

      Logger.warn(`User not authorized for private access: ${user.email}`);
      return false;
    },
    redirect({ url, baseUrl }) {
      // Allow safe relative URLs (reject protocol-relative URLs like "//evil.com")
      if (url.startsWith("/") && !url.startsWith("//"))
        return `${baseUrl}${url}`;
      // Allow URLs on the same origin
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        // Invalid URL, fall through to default
      }
      // Default to dashboard
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
        rateLimitHitCounter.add(1, { endpoint: "auth.signin" });
        Logger.warn(`Rate limit exceeded for sign in attempt: ${identifier}`);

        // oxlint-disable-next-line @typescript-eslint/consistent-type-assertions
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

      authSignInCounter.add(1);

      if (isNewUser) {
        authNewUserCounter.add(1);
        // Log new user signups
        Logger.info(`New user signed up: ${user.email}`);

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

      Logger.info(`Stripe customer created: ${updatedUser.email}`);
    },
  },
  pages: {
    signIn: "/sign-in",
    error: "/auth-error",
    verifyRequest: "/verify-request",
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.email) return null;

  return await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
}

export function isAdminUser(user: Pick<User, "role"> | null | undefined) {
  return user?.role === $Enums.UserRole.ADMIN;
}

export async function canManageTeam(
  teamId: number | null | undefined,
  user: Pick<User, "id" | "role"> | null | undefined
) {
  if (!teamId || !user) return false;
  if (isAdminUser(user)) return true;

  const team = await prisma.team.findFirst({
    where: { id: teamId },
    select: {
      ownerId: true,
      managers: { where: { userId: user.id }, select: { id: true } },
    },
  });
  if (!team) return false;

  return team.ownerId === user.id || team.managers.length > 0;
}

export async function canViewTeam(
  teamId: number | null | undefined,
  user: Pick<User, "id" | "role"> | null | undefined
) {
  if (!teamId || !user) return false;
  if (isAdminUser(user)) return true;

  const team = await prisma.team.findFirst({
    where: { id: teamId },
    select: {
      ownerId: true,
      users: { where: { id: user.id }, select: { id: true } },
      managers: { where: { userId: user.id }, select: { id: true } },
    },
  });
  if (!team) return false;

  return (
    team.ownerId === user.id ||
    team.users.length > 0 ||
    team.managers.length > 0
  );
}

export async function canEditScrim(
  scrimId: number,
  user: Pick<User, "id" | "role"> | null | undefined
) {
  if (!user) return false;
  if (isAdminUser(user)) return true;

  const scrim = await prisma.scrim.findUnique({
    where: { id: scrimId },
    select: { creatorId: true, teamId: true },
  });
  if (!scrim) return false;
  if (scrim.creatorId === user.id) return true;

  return await canManageTeam(scrim.teamId, user);
}

export async function canViewScrim(
  scrimId: number,
  user: Pick<User, "id" | "role"> | null | undefined
) {
  const scrim = await prisma.scrim.findUnique({
    where: { id: scrimId },
    select: { id: true, creatorId: true, teamId: true, guestMode: true },
  });
  if (!scrim) return false;
  if (scrim.guestMode) return true;
  if (!user) return false;
  if (isAdminUser(user)) return true;
  if (scrim.creatorId === user.id) return true;
  if (await canViewTeam(scrim.teamId, user)) return true;

  const tournamentMatch = await prisma.tournamentMatch.findFirst({
    where: { scrimId },
    select: {
      tournament: {
        select: {
          creatorId: true,
          teams: { select: { teamId: true } },
        },
      },
    },
  });

  if (!tournamentMatch) return false;
  if (tournamentMatch.tournament.creatorId === user.id) return true;

  const participatingTeamIds = tournamentMatch.tournament.teams
    .map((team) => team.teamId)
    .filter((id): id is number => id !== null);
  if (participatingTeamIds.length === 0) return false;

  const userTeams = await prisma.team.count({
    where: {
      id: { in: participatingTeamIds },
      users: { some: { id: user.id } },
    },
  });
  return userTeams > 0;
}

export async function getViewableScrimIds(
  scrimIds: number[],
  user: Pick<User, "id" | "role"> | null | undefined
) {
  const uniqueIds = [...new Set(scrimIds)];
  const checks = await Promise.all(
    uniqueIds.map(async (id) => ({
      id,
      canView: await canViewScrim(id, user),
    }))
  );
  return checks.filter((check) => check.canView).map((check) => check.id);
}

export async function canViewMapData(
  mapDataId: number,
  user: Pick<User, "id" | "role"> | null | undefined
) {
  const mapData = await prisma.mapData.findUnique({
    where: { id: mapDataId },
    select: { scrimId: true },
  });
  if (!mapData) return false;
  return await canViewScrim(mapData.scrimId, user);
}

export async function canViewMaps(
  mapIds: number[],
  user: Pick<User, "id" | "role"> | null | undefined
) {
  const uniqueIds = [...new Set(mapIds)];
  const maps = await prisma.map.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, scrimId: true },
  });
  if (maps.length !== uniqueIds.length) return false;

  const scrimIds = maps
    .map((map) => map.scrimId)
    .filter((id): id is number => id !== null);
  if (scrimIds.length !== maps.length) return false;

  const viewableScrimIds = new Set(await getViewableScrimIds(scrimIds, user));
  return maps.every((map) => map.scrimId && viewableScrimIds.has(map.scrimId));
}

export async function isAuthedToViewScrim(id: number) {
  const user = await getCurrentUser();
  return await canViewScrim(id, user);
}

export async function isAuthedToViewMap(scrimId: number, mapId: number) {
  const scrimMaps = await prisma.map.findMany({
    where: {
      scrimId,
    },
  });

  if (!scrimMaps) return false;

  const map = scrimMaps.find((m) => m.id === mapId);

  if (!map) return false;

  return await isAuthedToViewScrim(scrimId);
}

export async function isTeamOwnerOrManager(id: number) {
  const session = await auth();
  if (!session) return false;

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session?.user?.email)))
  );
  if (!user) return false;

  if (user.role === $Enums.UserRole.ADMIN) return true;

  const team = await prisma.team.findFirst({
    where: { id },
    select: {
      ownerId: true,
      managers: { where: { userId: user.id }, select: { id: true } },
    },
  });
  if (!team) return false;

  return team.ownerId === user.id || team.managers.length > 0;
}

export async function isAuthedToViewTeam(id: number) {
  const user = await getCurrentUser();

  return await canViewTeam(id, user);
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

  Logger.info(`Impersonation URL generated for user: ${email}`);

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

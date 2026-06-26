import MagicLinkEmail from "@parsertime/transactional/emails/magic-link";
import UserOnboardingEmail from "@parsertime/transactional/emails/onboarding";
import { authNewUserCounter, authSignInCounter } from "@/lib/axiom/metrics";
import { assertUserAllowed, enforceSignInRateLimit } from "@/lib/auth-gating";
import { email } from "@/lib/email";
import { createShortLink } from "@/lib/link-service";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { UsageEventName } from "@/lib/usage/names";
import { usage } from "@/lib/usage/server";
import { isTaggedError } from "@/lib/utils";
import { newUserWebhookConstructor, sendDiscordWebhook } from "@/lib/webhooks";
import { render } from "@react-email/render";
import { track } from "@vercel/analytics/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin, magicLink } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import isEmail from "validator/lib/isEmail";

function handleEmailError(error: unknown): never {
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
  }
  throw new Error("Unknown error sending email");
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXTAUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["github", "discord", "google"],
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Block disallowed users before any account or Stripe side effects.
        before: async (user) => {
          await assertUserAllowed(user.email);
          return { data: user };
        },
        after: async (user) => {
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.name || undefined,
          });
          await prisma.user.update({
            where: { email: user.email },
            data: { stripeId: customer.id },
          });
          Logger.info(`Stripe customer created: ${user.email}`);

          authNewUserCounter.add(1);
          void usage.track({ name: UsageEventName.SIGNUP, userId: user.id });
          Logger.info(`New user signed up: ${user.email}`);

          const wh = newUserWebhookConstructor(user);
          await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, wh);
          await track("New User", { email: user.email });

          const emailHtml = await render(
            UserOnboardingEmail({
              name: user.name || "user",
              email: user.email,
            })
          );
          try {
            await email.sendEmail({
              to: user.email,
              from: "noreply@lux.dev",
              subject: `Welcome to Parsertime!`,
              html: emailHtml,
            });
          } catch (error) {
            handleEmailError(error);
          }

          // Claim any ranked-tracker data parked for this user during migration.
          try {
            const { claimRankedDataForUser } =
              await import("@/lib/ranked/claim");
            await claimRankedDataForUser(user.id);
          } catch (error) {
            Logger.warn(
              `Ranked data auto-claim failed for ${user.email}: ${String(error)}`
            );
          }
        },
      },
    },
    session: {
      create: {
        // Runs on every sign-in, so existing users are gated and rate-limited here too.
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { id: true, email: true, name: true },
          });
          await assertUserAllowed(user?.email);
          await enforceSignInRateLimit(user ?? { id: session.userId });
          return { data: session };
        },
        after: async (session) => {
          authSignInCounter.add(1);
          await usage.track({
            name: UsageEventName.SIGNIN,
            userId: session.userId,
          });
        },
      },
    },
  },
  plugins: [
    // Maps onto the app's UserRole enum so existing ADMIN users keep their
    // privileges; powers admin-gated user management and impersonation. The
    // `roles` map keys the built-in access-control roles by our uppercase enum
    // values — without it, `hasPermission` resolves the acting user's "ADMIN"
    // role against Better Auth's lowercase `defaultRoles` ({ admin, user }),
    // finds nothing, and impersonation throws YOU_ARE_NOT_ALLOWED_TO_IMPERSONATE_USERS.
    admin({
      adminRoles: ["ADMIN"],
      defaultRole: "USER",
      roles: { ADMIN: adminAc, USER: userAc },
      // Preserve the historical behavior where an admin can impersonate any
      // user, including other admins (the built-in admin role otherwise lacks
      // the `impersonate-admins` permission).
      allowImpersonatingAdmins: true,
    }),
    magicLink({
      expiresIn: 60 * 10,
      sendMagicLink: async ({ email: userEmail, url }) => {
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
    }),
    nextCookies(), // must remain the last plugin
  ],
});

export type AuthInstance = typeof auth;

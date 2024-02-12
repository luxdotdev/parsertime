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

        const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
          body: JSON.stringify({
            personalizations: [{ to: [{ email }] }],
            from: { email: "noreply@lux.dev" },
            subject: "Sign in to Parsertime",
            content: [
              {
                type: "text/html",
                value: emailHtml,
              },
            ],
          }),
          headers: {
            Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        await track("Email Sent", { type: "Magic Link" });

        if (!response.ok) {
          const { errors } = (await response.json()) as { errors: string[] };
          throw new Error(JSON.stringify(errors));
        }
      },
    },
  ],
  callbacks: {
    async redirect({ baseUrl }) {
      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: "/sign-in",
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);

export async function isAuthedToViewScrim(id: number) {
  const session = await auth();
  if (!session) {
    return false;
  }

  const user = await prisma.user.findFirst({
    where: {
      email: session?.user?.email,
    },
  });

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

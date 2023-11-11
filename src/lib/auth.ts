import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import GithubProvider from "next-auth/providers/github";
import DiscordProvider from "next-auth/providers/discord";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import NextAuth, { NextAuthConfig } from "next-auth";

const prisma = new PrismaClient();

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
    // EmailProvider({
    //   id: "sendgrid",
    //   type: "email",
    //   async sendVerificationRequest({ identifier: email, url }) {
    //     // Call the cloud Email provider API for sending emails
    //     // See https://docs.sendgrid.com/api-reference/mail-send/mail-send
    //     const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    //       // The body format will vary depending on provider, please see their documentation
    //       // for further details.
    //       body: JSON.stringify({
    //         personalizations: [{ to: [{ email }] }],
    //         from: { email: "noreply@lux.dev" },
    //         subject: "Sign in to Your page",
    //         content: [
    //           {
    //             type: "text/plain",
    //             value: `Please click here to authenticate - ${url}`,
    //           },
    //         ],
    //       }),
    //       headers: {
    //         // Authentication will also vary from provider to provider, please see their docs.
    //         Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
    //         "Content-Type": "application/json",
    //       },
    //       method: "POST",
    //     });

    //     console.log(response);

    //     if (!response.ok) {
    //       const { errors } = await response.json();
    //       throw new Error(JSON.stringify(errors));
    //     }
    //   },
    // }),
  ],

  callbacks: {
    async redirect({ url, baseUrl }) {
      return `${baseUrl}/dashboard`;
    },
  },

  pages: {
    signIn: "/sign-in",
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);

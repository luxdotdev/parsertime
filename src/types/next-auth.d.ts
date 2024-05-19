import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** The user's email address. */
      email: string;
    } & DefaultSession["user"];
  }
}

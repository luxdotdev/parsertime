import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  // oxlint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Session {
    user: {
      /** The user's email address. */
      email: string;
    } & DefaultSession["user"];
  }
}

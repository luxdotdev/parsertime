import { z } from "zod";

const envVariables = z.object({
  // Database connection strings
  DATABASE_URL: z.string(),
  TEST_DB_URL: z.string(),

  // Vercel storage secrets
  BLOB_READ_WRITE_TOKEN: z.string(),
  EDGE_CONFIG: z.string(),
  KV_REST_API_URL: z.string(),
  KV_REST_API_TOKEN: z.string(),
  KV_REST_API_READ_ONLY_TOKEN: z.string(),
  KV_URL: z.string(),

  // Auth secrets
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  DISCORD_CLIENT_ID: z.string(),
  DISCORD_CLIENT_SECRET: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),

  // Stripe keys
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string(),
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),

  // AWS SES keys
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_SES_REGION: z.string(),

  // Misc
  NEXTAUTH_SECRET: z.string(),
  NEXTAUTH_URL: z.string(),
  DEV_TOKEN: z.string(),
  DISCORD_WEBHOOK_URL: z.string(),
  BUG_REPORT_WEBHOOK_URL: z.string(),
});

envVariables.parse(process.env);

declare global {
  namespace NodeJS {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface ProcessEnv extends z.infer<typeof envVariables> {}
  }
}

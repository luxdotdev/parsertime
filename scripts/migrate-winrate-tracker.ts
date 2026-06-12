/**
 * One-time migration script: winrate-tracker → Parsertime ranked matches.
 *
 * Reads the old winrate-tracker Postgres DB via `pg` (raw SQL, old schema),
 * resolves each old user to a Parsertime user (email-first, OAuth-key fallback),
 * then either upserts their ranked matches or parks a RankedImportClaim for
 * manual claim later.
 *
 * Usage:
 *   WINRATE_DATABASE_URL=postgres://... pnpm exec tsx scripts/migrate-winrate-tracker.ts
 *   WINRATE_DATABASE_URL=postgres://... pnpm exec tsx scripts/migrate-winrate-tracker.ts --dry-run
 */

import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import type { RankedExportBundle } from "@/lib/ranked/export-schema";

// ---------------------------------------------------------------------------
// Types for the old winrate-tracker schema rows
// ---------------------------------------------------------------------------

type OldUserRow = {
  id: string;
  email: string;
  name: string;
};

type OldAccountRow = {
  userId: string;
  providerId: string;
  accountId: string;
};

type OldMatchRow = {
  id: string;
  userId: string;
  map: string;
  mapType: string;
  result: string;
  groupSize: number;
  playedAt: Date;
};

type OldMatchHeroRow = {
  matchId: string;
  hero: string;
  role: string;
  percentage: number;
};

// ---------------------------------------------------------------------------
// Pure resolver — exported for unit tests
// ---------------------------------------------------------------------------

export type OldUserIdentity = { email: string; oauthKeys: string[] };

export function pickParsertimeMatch(
  oldUser: OldUserIdentity,
  byEmail: Map<string, string>,
  byOauthKey: Map<string, string>
): string | null {
  const emailHit = byEmail.get(oldUser.email);
  if (emailHit) return emailHit;
  for (const key of oldUser.oauthKeys) {
    const oauthHit = byOauthKey.get(key);
    if (oauthHit) return oauthHit;
  }
  return null;
}

// ---------------------------------------------------------------------------
// main()
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) {
    console.log("[migrate] DRY RUN — no writes will be made");
  }

  const winrateUrl = process.env.WINRATE_DATABASE_URL;
  if (!winrateUrl) {
    console.error(
      "Missing required environment variable: WINRATE_DATABASE_URL"
    );
    process.exit(1);
  }

  const pool = new Pool({ connectionString: winrateUrl });
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    // -----------------------------------------------------------------------
    // 1. Load all data from old DB
    // -----------------------------------------------------------------------

    const { rows: oldUsers } = await pool.query<OldUserRow>(
      'SELECT id, email, name FROM "user"'
    );
    console.log(`[migrate] Old users: ${oldUsers.length}`);

    const { rows: oldAccounts } = await pool.query<OldAccountRow>(
      'SELECT "userId", "providerId", "accountId" FROM "account"'
    );

    const { rows: oldMatches } = await pool.query<OldMatchRow>(
      'SELECT id, "userId", map, "mapType", result, "groupSize", "playedAt" FROM "match"'
    );
    console.log(`[migrate] Old matches: ${oldMatches.length}`);

    const { rows: oldMatchHeroes } = await pool.query<OldMatchHeroRow>(
      'SELECT "matchId", hero, role, percentage FROM "match_hero"'
    );

    // -----------------------------------------------------------------------
    // 2. Build lookup maps from the old data
    // -----------------------------------------------------------------------

    // userId → oauthKeys[]
    const oauthKeysByUserId = new Map<string, string[]>();
    for (const acc of oldAccounts) {
      const key = `${acc.providerId}:${acc.accountId}`;
      const existing = oauthKeysByUserId.get(acc.userId);
      if (existing) {
        existing.push(key);
      } else {
        oauthKeysByUserId.set(acc.userId, [key]);
      }
    }

    // matchId → heroes[]
    const heroesByMatchId = new Map<
      string,
      Array<{ hero: string; role: string; percentage: number }>
    >();
    for (const h of oldMatchHeroes) {
      const existing = heroesByMatchId.get(h.matchId);
      const entry = { hero: h.hero, role: h.role, percentage: h.percentage };
      if (existing) {
        existing.push(entry);
      } else {
        heroesByMatchId.set(h.matchId, [entry]);
      }
    }

    // userId → matches[]
    const matchesByUserId = new Map<string, OldMatchRow[]>();
    for (const m of oldMatches) {
      const existing = matchesByUserId.get(m.userId);
      if (existing) {
        existing.push(m);
      } else {
        matchesByUserId.set(m.userId, [m]);
      }
    }

    // -----------------------------------------------------------------------
    // 3. Build Parsertime identity indexes
    // -----------------------------------------------------------------------

    const ptUsers = await prisma.user.findMany({
      select: { id: true, email: true },
    });
    const ptByEmail = new Map<string, string>();
    for (const u of ptUsers) {
      if (u.email) ptByEmail.set(u.email, u.id);
    }

    const ptAccounts = await prisma.account.findMany({
      select: { provider: true, providerAccountId: true, userId: true },
    });
    const ptByOauthKey = new Map<string, string>();
    for (const a of ptAccounts) {
      ptByOauthKey.set(`${a.provider}:${a.providerAccountId}`, a.userId);
    }

    // -----------------------------------------------------------------------
    // 4. Process each old user
    // -----------------------------------------------------------------------

    let linked = 0;
    let parked = 0;

    for (const oldUser of oldUsers) {
      const oauthKeys = oauthKeysByUserId.get(oldUser.id) ?? [];
      const identity: OldUserIdentity = { email: oldUser.email, oauthKeys };

      const userMatches = matchesByUserId.get(oldUser.id) ?? [];

      // Build the export bundle (the canonical shape, also used as claim payload)
      const bundle: RankedExportBundle = {
        version: 1,
        user: {
          email: oldUser.email,
          oauthAccounts: oauthKeys.map((key) => {
            const colonIdx = key.indexOf(":");
            return {
              provider: key.slice(0, colonIdx),
              providerAccountId: key.slice(colonIdx + 1),
            };
          }),
        },
        matches: userMatches
          .filter((m) =>
            (["win", "loss", "draw"] as string[]).includes(m.result)
          )
          .map((m) => ({
            sourceId: m.id,
            map: m.map,
            mapType: m.mapType,
            result: m.result as "win" | "loss" | "draw",
            groupSize: m.groupSize,
            playedAt:
              m.playedAt instanceof Date
                ? m.playedAt.toISOString()
                : new Date(m.playedAt).toISOString(),
            heroes: heroesByMatchId.get(m.id) ?? [],
          })),
      };

      const ptUserId = pickParsertimeMatch(identity, ptByEmail, ptByOauthKey);

      if (ptUserId !== null) {
        // Upsert each match (idempotent)
        if (!dryRun) {
          for (const m of bundle.matches) {
            await prisma.rankedMatch.upsert({
              where: {
                userId_sourceId: { userId: ptUserId, sourceId: m.sourceId },
              },
              create: {
                userId: ptUserId,
                map: m.map,
                mapType: m.mapType,
                result: m.result,
                groupSize: m.groupSize,
                playedAt: new Date(m.playedAt),
                sourceId: m.sourceId,
                heroes: { create: [...m.heroes] },
              },
              update: {},
            });
          }
        }
        console.log(
          `[migrate] Linked ${oldUser.email} → ${ptUserId} (${bundle.matches.length} match(es))`
        );
        linked++;
      } else {
        // Park a claim and write a per-user export file
        if (!dryRun) {
          await prisma.rankedImportClaim.create({
            data: {
              email: oldUser.email,
              oauthKey: oauthKeys[0] ?? null,
              // Prisma Json field accepts any serialisable value
              payload: bundle as object,
            },
          });

          const exportDir = path.resolve(
            path.dirname(new URL(import.meta.url).pathname),
            "..",
            "migration-exports"
          );
          fs.mkdirSync(exportDir, { recursive: true });
          const safeEmail = oldUser.email.replace(/[^a-zA-Z0-9@._-]/g, "_");
          fs.writeFileSync(
            path.join(exportDir, `${safeEmail}.json`),
            JSON.stringify(bundle, null, 2)
          );
        }
        console.log(
          `[migrate] Parked claim for ${oldUser.email} (${bundle.matches.length} match(es))`
        );
        parked++;
      }
    }

    console.log(
      `\n[migrate] Summary — Linked: ${linked}, Parked: ${parked}, dryRun=${dryRun}`
    );
  } finally {
    await pool.end();
    await prisma.$disconnect();
  }
}

// Entrypoint guard — compatible with both ESM (import.meta.url) and tsx runner
const isMain =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith("migrate-winrate-tracker.ts") ||
    process.argv[1].endsWith("migrate-winrate-tracker.js"));

if (isMain) {
  main().catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
}

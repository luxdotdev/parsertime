#!/usr/bin/env bun
// Verification gate: exits 0 only when (1) no DB row still points at Vercel Blob
// and (2) every stored proxy path's R2 object downloads non-empty. This gate
// authorizes removing Vercel Blob read access (next.config.ts).
// Usage: bun scripts/verify-avatars-r2.ts
import { imageKey, isVercelBlobUrl, type ImageKind } from "@/lib/avatar";
import prisma from "@/lib/prisma";
import { r2 } from "@/lib/r2";

type Check = { kind: ImageKind; id: string; value: string };

async function main() {
  const problems: string[] = [];
  const checks: Check[] = [];

  const users = await prisma.user.findMany({
    select: { id: true, image: true, bannerImage: true },
  });
  for (const u of users) {
    if (isVercelBlobUrl(u.image)) {
      problems.push(`user ${u.id} image still on Blob`);
    } else if (u.image?.startsWith("/api/image/")) {
      checks.push({ kind: "avatar", id: u.id, value: u.image });
    }

    if (isVercelBlobUrl(u.bannerImage)) {
      problems.push(`user ${u.id} banner still on Blob`);
    } else if (u.bannerImage?.startsWith("/api/image/")) {
      checks.push({ kind: "banner", id: u.id, value: u.bannerImage });
    }
  }

  const teams = await prisma.team.findMany({
    select: { id: true, image: true },
  });
  for (const t of teams) {
    if (isVercelBlobUrl(t.image)) {
      problems.push(`team ${t.id} image still on Blob`);
    } else if (t.image?.startsWith("/api/image/")) {
      checks.push({ kind: "team", id: String(t.id), value: t.image });
    }
  }

  for (const c of checks) {
    try {
      const bytes = await r2.download(imageKey(c.kind, c.id));
      if (bytes.byteLength === 0) {
        problems.push(`${c.kind} ${c.id}: empty R2 object`);
      }
    } catch {
      problems.push(`${c.kind} ${c.id}: R2 object missing for ${c.value}`);
    }
  }

  console.log(`Checked ${checks.length} migrated image(s).`);
  if (problems.length > 0) {
    console.error(`VERIFICATION FAILED (${problems.length}):`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exitCode = 1;
    return;
  }
  console.log("VERIFICATION PASSED. Safe to remove Vercel Blob read access.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

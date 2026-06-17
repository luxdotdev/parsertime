#!/usr/bin/env bun
// Backfill existing Vercel Blob avatars/banners/team images into R2.
// Usage:
//   bun scripts/migrate-avatars-to-r2.ts            # dry-run (no writes)
//   bun scripts/migrate-avatars-to-r2.ts --apply    # perform the migration
//
// Images at or under OVERSIZE_LIMIT are copied into R2 and the DB row is
// rewritten to the proxy path. Anything larger is treated as junk (a legacy
// pre-cap upload — e.g. one ~72 MB team image) and is NOT migrated; its DB row
// is instead cleared to null so it falls back to the default generated avatar.
// Either way the row stops pointing at Vercel Blob, so the verification gate can
// pass and Blob read access can be removed safely.
import { imageKey, imageProxyPath, isVercelBlobUrl } from "@/lib/avatar";
import prisma from "@/lib/prisma";
import { r2 } from "@/lib/r2";

const APPLY = process.argv.includes("--apply");
const OVERSIZE_LIMIT = 64 * 1024 * 1024;

type Job =
  | { kind: "avatar"; id: string; url: string }
  | { kind: "banner"; id: string; url: string }
  | { kind: "team"; id: string; url: string };

async function collectJobs(): Promise<Job[]> {
  const jobs: Job[] = [];

  const users = await prisma.user.findMany({
    select: { id: true, image: true, bannerImage: true },
  });
  for (const u of users) {
    if (isVercelBlobUrl(u.image)) {
      jobs.push({ kind: "avatar", id: u.id, url: u.image! });
    }
    if (isVercelBlobUrl(u.bannerImage)) {
      jobs.push({ kind: "banner", id: u.id, url: u.bannerImage! });
    }
  }

  const teams = await prisma.team.findMany({ select: { id: true, image: true } });
  for (const t of teams) {
    if (isVercelBlobUrl(t.image)) {
      jobs.push({ kind: "team", id: String(t.id), url: t.image! });
    }
  }

  return jobs;
}

async function writeField(job: Job, value: string | null): Promise<void> {
  if (job.kind === "team") {
    await prisma.team.update({
      where: { id: Number(job.id) },
      data: { image: value },
    });
  } else if (job.kind === "avatar") {
    await prisma.user.update({ where: { id: job.id }, data: { image: value } });
  } else {
    await prisma.user.update({
      where: { id: job.id },
      data: { bannerImage: value },
    });
  }
}

type Outcome = "migrated" | "reset";

async function processOne(job: Job): Promise<Outcome> {
  const res = await fetch(job.url);
  if (!res.ok) throw new Error(`fetch ${job.url} -> ${res.status}`);

  const declared = Number(res.headers.get("content-length") ?? "0");
  if (declared > OVERSIZE_LIMIT) {
    await writeField(job, null);
    console.log(`reset ${job.kind} ${job.id} (${declared} bytes, too large)`);
    return "reset";
  }

  const body = Buffer.from(await res.arrayBuffer());
  if (body.byteLength > OVERSIZE_LIMIT) {
    await writeField(job, null);
    console.log(
      `reset ${job.kind} ${job.id} (${body.byteLength} bytes, too large)`
    );
    return "reset";
  }

  await r2.upload({
    key: imageKey(job.kind, job.id),
    body,
    contentType: "image/png",
  });
  await writeField(job, imageProxyPath(job.kind, job.id, Date.now()));
  console.log(`migrated ${job.kind} ${job.id}`);
  return "migrated";
}

async function main() {
  const jobs = await collectJobs();
  console.log(`${jobs.length} image(s) still on Vercel Blob.`);

  if (!APPLY) {
    for (const j of jobs) console.log(`  would process ${j.kind} ${j.id}`);
    console.log("Dry-run only. Re-run with --apply to migrate.");
    return;
  }

  let migrated = 0;
  let reset = 0;
  const failures: { job: Job; error: string }[] = [];
  for (const job of jobs) {
    try {
      const outcome = await processOne(job);
      if (outcome === "migrated") migrated += 1;
      else reset += 1;
    } catch (error) {
      failures.push({ job, error: String(error) });
      console.error(`FAILED ${job.kind} ${job.id}: ${String(error)}`);
    }
  }

  console.log(
    `Done. ${migrated} migrated, ${reset} reset to default, ${failures.length} failed.`
  );
  if (failures.length > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

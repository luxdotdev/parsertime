#!/usr/bin/env bun
// Backfill existing Vercel Blob avatars/banners/team images into R2.
// Usage:
//   bun scripts/migrate-avatars-to-r2.ts            # dry-run (no writes)
//   bun scripts/migrate-avatars-to-r2.ts --apply    # perform the migration
import { imageKey, imageProxyPath, isVercelBlobUrl } from "@/lib/avatar";
import prisma from "@/lib/prisma";
import { r2 } from "@/lib/r2";

const APPLY = process.argv.includes("--apply");
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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

async function migrateOne(job: Job): Promise<void> {
  const res = await fetch(job.url);
  if (!res.ok) throw new Error(`fetch ${job.url} -> ${res.status}`);

  const contentLength = res.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_IMAGE_BYTES) {
    throw new Error(`image larger than ${MAX_IMAGE_BYTES} bytes`);
  }

  const body = Buffer.from(await res.arrayBuffer());
  if (body.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(`image larger than ${MAX_IMAGE_BYTES} bytes`);
  }

  await r2.upload({
    key: imageKey(job.kind, job.id),
    body,
    contentType: "image/png",
  });

  const path = imageProxyPath(job.kind, job.id, Date.now());
  if (job.kind === "team") {
    await prisma.team.update({
      where: { id: Number(job.id) },
      data: { image: path },
    });
  } else if (job.kind === "avatar") {
    await prisma.user.update({ where: { id: job.id }, data: { image: path } });
  } else {
    await prisma.user.update({
      where: { id: job.id },
      data: { bannerImage: path },
    });
  }
}

async function main() {
  const jobs = await collectJobs();
  console.log(`${jobs.length} image(s) still on Vercel Blob.`);

  if (!APPLY) {
    for (const j of jobs) console.log(`  would migrate ${j.kind} ${j.id}`);
    console.log("Dry-run only. Re-run with --apply to migrate.");
    return;
  }

  let ok = 0;
  const failures: { job: Job; error: string }[] = [];
  for (const job of jobs) {
    try {
      await migrateOne(job);
      ok += 1;
      console.log(`migrated ${job.kind} ${job.id}`);
    } catch (error) {
      failures.push({ job, error: String(error) });
      console.error(`FAILED ${job.kind} ${job.id}: ${String(error)}`);
    }
  }

  console.log(`Done. ${ok} migrated, ${failures.length} failed.`);
  if (failures.length > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

#!/usr/bin/env bun
/**
 * One-shot FSR bootstrap: run a full recompute and report counts. Safe to run
 * any time; the daily cron also calls recomputeAllFsr() after the TSR steps.
 *
 * Usage: bun scripts/fsr-bootstrap.ts
 */
import { recomputeAllFsr } from "../src/lib/fsr/compute";
import prisma from "../src/lib/prisma";

async function main() {
  const result = await recomputeAllFsr();
  console.log("FSR recompute complete:", JSON.stringify(result, null, 2));
}

main()
  .catch((e) => {
    console.error("ERR", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(process.exitCode ?? 0);
  });

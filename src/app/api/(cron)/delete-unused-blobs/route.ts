import {
  cronDeletedItemsCounter,
  cronJobCounter,
  cronJobDuration,
} from "@/lib/axiom/metrics";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { del, list } from "@vercel/blob";
import type { NextRequest } from "next/server";

const VALID_IMAGE_URL_HOSTS = {
  vercel_blob: "public.blob.vercel-storage.com",
};
const BLOB_DELETE_GRACE_MS = 60 * 60 * 1000;

function isCronAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return (
    Boolean(secret) && req.headers.get("Authorization") === `Bearer ${secret}`
  );
}

function isVercelBlobUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(`.${VALID_IMAGE_URL_HOSTS.vercel_blob}`)
    );
  } catch {
    return false;
  }
}

export async function DELETE(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const start = performance.now();
  cronJobCounter.add(1, { job: "delete-unused-blobs" });

  const usersWithImages = await prisma.user.findMany({
    where: { OR: [{ image: { not: null } }, { bannerImage: { not: null } }] },
    select: { image: true, bannerImage: true },
  });

  const userImages = usersWithImages.flatMap((user) =>
    [user.image, user.bannerImage].filter(Boolean)
  );
  const userBlobs = userImages.filter(isVercelBlobUrl);

  const teamsWithImages = await prisma.team.findMany({
    where: { image: { not: null } },
    select: { image: true },
  });

  const teamImages = teamsWithImages.map((team) => team.image).filter(Boolean);
  const teamBlobs = teamImages.filter(isVercelBlobUrl);

  // Get all blobs
  const { blobs } = await list();

  const activeBlobs = new Set([...userBlobs, ...teamBlobs]);
  const now = Date.now();
  const filteredBlobs = blobs
    .filter((blob) => !activeBlobs.has(blob.url))
    .filter(
      (blob) => now - new Date(blob.uploadedAt).getTime() > BLOB_DELETE_GRACE_MS
    )
    .map((blob) => blob.url);

  for (const url of filteredBlobs) {
    Logger.info(`Deleting unused blob: ${url}`);
    await del(url);
  }

  cronDeletedItemsCounter.add(filteredBlobs.length, {
    job: "delete-unused-blobs",
  });
  cronJobDuration.record(performance.now() - start, {
    job: "delete-unused-blobs",
  });
  Logger.info(`Deleted ${filteredBlobs.length} unused blobs`);

  return new Response("OK", { status: 200 });
}

// This is necessary for using Vercel Cron Jobs
export async function GET(req: NextRequest) {
  return await DELETE(req);
}

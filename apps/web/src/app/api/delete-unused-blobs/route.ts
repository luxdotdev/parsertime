import Logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import { del, list } from "@vercel/blob";

const VALID_IMAGE_URL_HOSTS = {
  vercel_blob: "public.blob.vercel-storage.com",
};

export async function DELETE() {
  const usersWithImages = await prisma.user.findMany({
    where: {
      image: {
        not: null,
      },
    },
    select: {
      image: true,
    },
  });

  const userImages = usersWithImages.map((user) => user.image) as string[];
  const userBlobs = userImages.filter((url) =>
    url.includes(VALID_IMAGE_URL_HOSTS.vercel_blob)
  );

  const teamsWithImages = await prisma.team.findMany({
    where: {
      image: {
        not: null,
      },
    },
    select: {
      image: true,
    },
  });

  const teamImages = teamsWithImages.map((team) => team.image) as string[];
  const teamBlobs = teamImages.filter((url) =>
    url.includes(VALID_IMAGE_URL_HOSTS.vercel_blob)
  );

  // Get all blobs
  const { blobs } = await list();

  const filteredBlobs = blobs
    .filter(
      (blob) => !userBlobs.includes(blob.url) && !teamBlobs.includes(blob.url)
    )
    .map((blob) => blob.url);

  for (const url of filteredBlobs) {
    Logger.log(`Deleting unused blob: ${url}`);
    await del(url);
  }

  Logger.log(`Deleted ${filteredBlobs.length} unused blobs`);

  return new Response(`OK`, {
    status: 200,
  });
}

// This is necessary for using Vercel Cron Jobs
export async function GET() {
  return await DELETE();
}

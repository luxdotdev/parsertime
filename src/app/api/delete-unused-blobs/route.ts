import Logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import { del, list } from "@vercel/blob";

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
    url.includes("vercel-storage.com")
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
    url.includes("vercel-storage.com")
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

  return new Response(`Deleted ${filteredBlobs.length} unused blobs`, {
    status: 200,
  });
}

// This is necessary for using Vercel Cron Jobs
export async function GET() {
  return await DELETE();
}

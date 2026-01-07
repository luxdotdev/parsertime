import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function DELETE() {
  const scrimsWithoutMaps = await prisma.scrim.findMany({
    where: { maps: { none: {} } },
    select: { id: true },
  });

  if (scrimsWithoutMaps.length === 0) {
    Logger.info("No empty scrims found");
  } else {
    Logger.info(
      `Found the following empty scrims: ${scrimsWithoutMaps
        .map((scrim) => scrim.id)
        .join(", ")}`
    );
  }

  for (const scrim of scrimsWithoutMaps) {
    Logger.info(`Deleting scrim ${scrim.id}`);
    await prisma.scrim.delete({ where: { id: scrim.id } });
  }

  return new Response("OK", { status: 200 });
}

// This is necessary for using Vercel Cron Jobs
export async function GET() {
  return await DELETE();
}

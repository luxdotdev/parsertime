import Logger from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function DELETE() {
  const scrimsWithoutMaps = await prisma.scrim.findMany({
    where: {
      maps: {
        none: {},
      },
    },
    select: {
      id: true,
    },
  });

  Logger.log(
    `Found the following scrims without maps: ${scrimsWithoutMaps
      .map((scrim) => scrim.id)
      .join(", ")}`
  );

  for (const scrim of scrimsWithoutMaps) {
    Logger.log(`Deleting scrim ${scrim.id}`);
    await prisma.scrim.delete({
      where: {
        id: scrim.id,
      },
    });
  }

  return new Response(`OK`, {
    status: 200,
  });
}

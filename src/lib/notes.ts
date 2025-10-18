import { getScrim } from "@/data/scrim-dto";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { unauthorized } from "next/navigation";

type UpsertNoteArgs = {
  scrimId: number;
  mapDataId: number;
  content: string;
};

export async function upsertNote(data: UpsertNoteArgs) {
  const session = await auth();
  if (!session) unauthorized();

  const user = await getUser(session.user?.email);

  if (!user) {
    Logger.error("User not found for session: ", session);
    throw new Error("User not found");
  }

  const map = await prisma.mapData.findFirst({
    where: { id: data.mapDataId, scrimId: data.scrimId },
  });

  const scrim = await prisma.scrim.findFirst({
    where: { id: data.scrimId },
  });

  if (!scrim) {
    Logger.error(`Cannot create note: Scrim with ID ${data.scrimId} not found`);
    throw new Error("Scrim not found");
  }

  if (!map) {
    Logger.error(
      `Cannot create Note: Map with ID ${data.mapDataId} does not exist on Scrim ${data.scrimId}`
    );
    throw new Error("Map not found");
  }

  const userOnTeam = await prisma.user.findFirst({
    where: {
      id: user.id,
      teams: {
        some: {
          scrims: {
            some: {
              id: data.scrimId,
            },
          },
        },
      },
    },
  });

  if (!userOnTeam) {
    Logger.error(`User ${user.id} not authorized for scrim ${data.scrimId}`);
    throw new Error("Unauthorized: You must be a team member to create notes");
  }

  return await prisma.note.upsert({
    where: {
      scrimId_MapDataId: {
        scrimId: data.scrimId,
        MapDataId: data.mapDataId,
      },
    },
    update: {
      content: data.content,
    },
    create: {
      content: data.content,
      scrimId: data.scrimId,
      MapDataId: data.mapDataId,
    },
  });
}

export async function getNote(data: UpsertNoteArgs) {
  const session = await auth();
  if (!session) unauthorized();

  const user = await getUser(session.user?.email);

  if (!user) {
    Logger.error("User not found for session: ", session);
    throw new Error("User not found");
  }

  const scrim = await getScrim(data.scrimId);

  if (!scrim) {
    Logger.error(`Scrim with ID ${data.scrimId} not found`);
    throw new Error("Scrim not found");
  }

  const map = await prisma.mapData.findFirst({
    where: { id: data.mapDataId, scrimId: data.scrimId },
  });

  if (!map) {
    Logger.error(
      `Map with ID ${data.mapDataId} does not exist on Scrim ${data.scrimId}`
    );
    throw new Error("Map not found");
  }

  const userOnTeam = await prisma.user.findFirst({
    where: {
      id: user.id,
      teams: {
        some: {
          scrims: {
            some: {
              id: data.scrimId,
            },
          },
        },
      },
    },
  });

  if (!userOnTeam) {
    Logger.error(`User ${user.id} not authorized for scrim ${data.scrimId}`);
    throw new Error("Unauthorized: You must be a team member to view notes");
  }

  return await prisma.note.findFirst({
    where: {
      scrimId: data.scrimId,
      MapDataId: data.mapDataId,
    },
  });
}

import "server-only";

import prisma from "@/lib/prisma";
import type { MapGroup } from "@prisma/client";
import { cache } from "react";

/**
 * Get all map groups for a team
 */
export const getMapGroupsForTeam = cache(
  async (teamId: number): Promise<MapGroup[]> => {
    return await prisma.mapGroup.findMany({
      where: {
        teamId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
);

/**
 * Get a specific map group by ID
 */
export const getMapGroupById = cache(
  async (groupId: number): Promise<MapGroup | null> => {
    return await prisma.mapGroup.findUnique({
      where: {
        id: groupId,
      },
    });
  }
);

/**
 * Create a new map group
 */
export async function createMapGroup(data: {
  name: string;
  description?: string;
  teamId: number;
  mapIds: number[];
  category?: string;
  createdBy: string;
}): Promise<MapGroup> {
  return await prisma.mapGroup.create({
    data: {
      name: data.name,
      description: data.description,
      teamId: data.teamId,
      mapIds: data.mapIds,
      category: data.category,
      createdBy: data.createdBy,
    },
  });
}

/**
 * Update an existing map group
 */
export async function updateMapGroup(
  groupId: number,
  data: {
    name?: string;
    description?: string;
    mapIds?: number[];
    category?: string;
  }
): Promise<MapGroup> {
  return await prisma.mapGroup.update({
    where: {
      id: groupId,
    },
    data: {
      name: data.name,
      description: data.description,
      mapIds: data.mapIds,
      category: data.category,
    },
  });
}

/**
 * Delete a map group
 */
export async function deleteMapGroup(groupId: number): Promise<void> {
  await prisma.mapGroup.delete({
    where: {
      id: groupId,
    },
  });
}

/**
 * Get map groups by category
 */
export const getMapGroupsByCategory = cache(
  async (teamId: number, category: string): Promise<MapGroup[]> => {
    return await prisma.mapGroup.findMany({
      where: {
        teamId,
        category,
      },
      orderBy: {
        name: "asc",
      },
    });
  }
);

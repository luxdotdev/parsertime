import type { MapGroup } from "@prisma/client";

/**
 * Map group with creator information
 */
export type MapGroupWithCreator = MapGroup & {
  creator: {
    name: string | null;
    email: string;
  };
};

/**
 * Formatted map group for API responses
 */
export type FormattedMapGroup = {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  mapIds: number[];
  mapCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Request body for creating a map group
 */
export type CreateMapGroupRequest = {
  name: string;
  description?: string;
  teamId: number;
  mapIds: number[];
  category?: string;
};

/**
 * Request body for updating a map group
 */
export type UpdateMapGroupRequest = {
  name?: string;
  description?: string;
  mapIds?: number[];
  category?: string;
};

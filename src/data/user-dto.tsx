import "server-only";

import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
import { cache } from "react";

async function getUserFn(email: string | undefined) {
  if (!email) return null;

  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) return null;

  return user;
}

/**
 * Get a user from the database by email address.
 * This function is cached for performance.
 *
 * @param email - The email address of the user to get.
 * @returns The user with the specified email address or null if no user was found.
 */
export const getUser = cache(getUserFn);

async function getTeamsWithPermsFn(email: string | undefined) {
  const user = await getUser(email);

  const teams = await prisma.team.findMany({
    where: {
      OR: [
        { ownerId: user?.id },
        {
          users: {
            some: {
              id: user?.id,
              role: { in: [$Enums.UserRole.MANAGER, $Enums.UserRole.ADMIN] },
            },
          },
        },
        { managers: { some: { userId: user?.id } } },
      ],
    },
  });

  return teams;
}

/**
 * Get all teams that the user has permission to modify.
 * This function is cached for performance.
 *
 * @param userId - The user ID of the user to get teams for.
 * @returns The teams that the user has permission to view.
 */
export const getTeamsWithPerms = cache(getTeamsWithPermsFn);

async function getAppSettingsFn(email: string | undefined) {
  const user = await getUser(email);
  if (!user) return null;

  const appSettings = await prisma.appSettings.findFirst({
    where: { userId: user?.id },
  });

  return appSettings;
}

/**
 * Get the app settings for a user.
 * This function is cached for performance.
 *
 * @param email - The email address of the user to get app settings for.
 * @returns The app settings for the user.
 */
export const getAppSettings = cache(getAppSettingsFn);

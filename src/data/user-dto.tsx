import "server-only";
import prisma from "@/lib/prisma";
import { cache } from "react";
import { $Enums, User } from "@prisma/client";

async function getUserFn(email: string | undefined) {
  if (!email) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: { email },
  });

  if (!user) {
    return null;
  }

  return user;
}

/**
 * Get a user from the database by email address.
 * This function is cached for performance.
 *
 * @param {string} email - The email address of the user to get.
 * @returns {User} The user with the specified email address or null if no user was found.
 * @see {@link User}
 */
export const getUser = cache(getUserFn);

async function getTeamsWithPermsFn(email: string | undefined) {
  const user = await getUser(email);

  const teams = await prisma.team.findMany({
    where: {
      OR: [
        {
          ownerId: user?.id,
        },
        {
          users: {
            some: {
              id: user?.id,
              role: {
                in: [$Enums.UserRole.MANAGER, $Enums.UserRole.ADMIN],
              },
            },
          },
        },
        {
          managers: {
            some: {
              userId: user?.id,
            },
          },
        },
      ],
    },
  });

  return teams;
}

/**
 * Get all teams that the user has permission to modify.
 * This function is cached for performance.
 *
 * @param {string} userId - The user ID of the user to get teams for.
 * @returns {Team[]} The teams that the user has permission to view.
 * @see {@link Team}
 */
export const getTeamsWithPerms = cache(getTeamsWithPermsFn);

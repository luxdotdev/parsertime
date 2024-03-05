import "server-only";
import prisma from "@/lib/prisma";
import { cache } from "react";
import { User } from "@prisma/client";

async function getUserFn(email: string | null | undefined) {
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

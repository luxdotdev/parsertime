import "server-only";
import prisma from "@/lib/prisma";
import { cache } from "react";

export const getUser = cache(async (email: string) => {
  return await prisma.user.findFirst({
    where: {
      email: email,
    },
  });
});

import "server-only";
import prisma from "@/lib/prisma";
import { cache } from "react";

export const getScrim = cache(async (id: number) => {
  return await prisma.scrim.findFirst({
    where: {
      id: id,
    },
  });
});

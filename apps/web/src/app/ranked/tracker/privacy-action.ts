"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function setRankedStatsPublic(
  isPublic: boolean
): Promise<{ success: boolean }> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { success: false };

  await prisma.user.update({
    where: { email },
    data: { rankedStatsPublic: isPublic },
  });
  revalidatePath("/settings/accounts");
  return { success: true };
}

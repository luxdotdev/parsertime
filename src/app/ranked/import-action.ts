"use server";

import { parseRankedBundle } from "@/lib/ranked/export-schema";
import { importRankedBundle } from "@/lib/ranked/importer";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type ImportResult = {
  success: boolean;
  error?: string;
  imported?: number;
  skipped?: number;
};

export async function importRankedJson(raw: string): Promise<ImportResult> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { success: false, error: "Not authenticated" };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { success: false, error: "Not authenticated" };

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { success: false, error: "File is not valid JSON" };
  }

  const parsed = parseRankedBundle(json);
  if (!parsed.ok) return { success: false, error: parsed.error };

  const { imported, skipped } = await importRankedBundle(user.id, parsed.bundle);
  revalidatePath("/ranked");
  return { success: true, imported, skipped };
}

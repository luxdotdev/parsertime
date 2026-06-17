import prisma from "@/lib/prisma";
import { parseRankedBundle } from "./export-schema";
import { importRankedBundle } from "./importer";

export function deriveOauthKeys(
  accounts: { provider: string; providerAccountId: string }[]
): string[] {
  return accounts.map((a) => `${a.provider}:${a.providerAccountId}`);
}

// Run after a user signs in / is created. Attaches any parked ranked data
// whose email or oauthKey matches this user, then marks the claims consumed.
export async function claimRankedDataForUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { provider: true, providerAccountId: true },
  });
  const oauthKeys = deriveOauthKeys(accounts);

  const claims = await prisma.rankedImportClaim.findMany({
    where: {
      claimedAt: null,
      OR: [
        { email: user.email },
        ...(oauthKeys.length > 0 ? [{ oauthKey: { in: oauthKeys } }] : []),
      ],
    },
  });

  for (const claim of claims) {
    const parsed = parseRankedBundle(claim.payload);
    if (parsed.ok) {
      await importRankedBundle(userId, parsed.bundle);
    }
    await prisma.rankedImportClaim.update({
      where: { id: claim.id },
      data: { claimedAt: new Date() },
    });
  }
}

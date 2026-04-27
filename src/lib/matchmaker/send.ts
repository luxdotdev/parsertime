import prisma from "@/lib/prisma";
import { sendScrimRequestNotification } from "@/lib/bot-events";
import { matchmakerCounter } from "@/lib/axiom/metrics";
import { renderScrimRequestMessage } from "@/lib/matchmaker/messages";
import { getTierBucket } from "@/lib/tsr/tier-bucket";
import { getPlayerTsrByBattletag } from "@/lib/tsr/lookup";
import { notifications } from "@/lib/notifications";
import { Logger } from "@/lib/logger";
import { auditLog } from "@/lib/audit-logs";
import { UserRole } from "@prisma/client";

const COOLDOWN_HOURS = 24;
const DAILY_LIMIT = 10;

export type SendResult =
  | { ok: true; requestId: string }
  | { ok: false; status: 401 | 403 | 409 | 422 | 429; reason: string };

export async function sendScrimRequest(input: {
  fromTeamId: number;
  toTeamId: number;
  sentByUserId: string;
}): Promise<SendResult> {
  const [fromTeam, toTeamMeta, sender] = await Promise.all([
    prisma.team.findUnique({
      where: { id: input.fromTeamId },
      select: {
        ownerId: true,
        name: true,
        readonly: true,
        managers: { select: { userId: true } },
      },
    }),
    prisma.team.findUnique({
      where: { id: input.toTeamId },
      select: { readonly: true },
    }),
    prisma.user.findUnique({
      where: { id: input.sentByUserId },
      select: { role: true },
    }),
  ]);
  if (!fromTeam) return { ok: false, status: 403, reason: "Not a manager" };
  if (fromTeam.readonly) {
    return {
      ok: false,
      status: 422,
      reason: "Read-only teams cannot send scrim requests",
    };
  }
  if (toTeamMeta?.readonly) {
    return {
      ok: false,
      status: 422,
      reason: "Target team is archived and cannot receive scrim requests",
    };
  }

  const isOwner = fromTeam.ownerId === input.sentByUserId;
  const isManager = fromTeam.managers.some(
    (m) => m.userId === input.sentByUserId
  );
  const isAdmin = sender?.role === UserRole.ADMIN;
  if (!isOwner && !isManager && !isAdmin) {
    return { ok: false, status: 403, reason: "Not a manager" };
  }

  const [fromSnap, toSnap] = await Promise.all([
    prisma.teamTsrSnapshot.findUnique({ where: { teamId: input.fromTeamId } }),
    prisma.teamTsrSnapshot.findUnique({ where: { teamId: input.toTeamId } }),
  ]);
  if (!fromSnap) {
    return { ok: false, status: 422, reason: "Your team has no Team TSR yet" };
  }
  if (!toSnap) {
    return { ok: false, status: 422, reason: "Target team has no Team TSR" };
  }

  const since = new Date(Date.now() - COOLDOWN_HOURS * 3_600_000);

  const recent = await prisma.scrimRequest.findFirst({
    where: {
      fromTeamId: input.fromTeamId,
      toTeamId: input.toTeamId,
      createdAt: { gt: since },
    },
  });
  if (recent) {
    return {
      ok: false,
      status: 409,
      reason: "Already messaged this team in the last 24 hours",
    };
  }

  const sentToday = await prisma.scrimRequest.count({
    where: { fromTeamId: input.fromTeamId, createdAt: { gt: since } },
  });
  if (sentToday >= DAILY_LIMIT) {
    return {
      ok: false,
      status: 429,
      reason: "Daily scrim request limit reached (10/24h)",
    };
  }

  const fromBucket = getTierBucket(fromSnap.rating);
  const message = renderScrimRequestMessage({
    fromTeamName: fromTeam.name,
    fromBracketLabel: fromBucket.label,
    fromTsr: fromSnap.rating,
    toTsr: toSnap.rating,
  });

  const created = await prisma.scrimRequest.create({
    data: {
      fromTeamId: input.fromTeamId,
      toTeamId: input.toTeamId,
      sentByUserId: input.sentByUserId,
      fromTsr: fromSnap.rating,
      toTsr: toSnap.rating,
      message,
    },
  });
  matchmakerCounter.add(1, { outcome: "sent" });

  const senderUser = await prisma.user.findUnique({
    where: { id: input.sentByUserId },
    select: { email: true, name: true },
  });
  await auditLog.createAuditLog({
    userEmail: senderUser?.email ?? "Unknown",
    action: "SCRIM_REQUEST_SENT",
    target: `Team ${input.toTeamId}`,
    details: `Scrim request sent from team ${input.fromTeamId} to team ${input.toTeamId} by ${senderUser?.name ?? "Unknown"}`,
  });

  // Delivery is best-effort — failures don't roll back the audit row.
  await deliverNotifications({
    fromTeamId: input.fromTeamId,
    fromTeamName: fromTeam.name,
    fromBracketLabel: fromBucket.label,
    fromTsr: fromSnap.rating,
    toTeamId: input.toTeamId,
    toTsr: toSnap.rating,
    message,
  });

  return { ok: true, requestId: created.id };
}

async function deliverNotifications(input: {
  fromTeamId: number;
  fromTeamName: string;
  fromBracketLabel: string;
  fromTsr: number;
  toTeamId: number;
  toTsr: number;
  message: string;
}): Promise<void> {
  const target = await prisma.team.findUnique({
    where: { id: input.toTeamId },
    select: {
      ownerId: true,
      managers: { select: { userId: true } },
      users: { select: { battletag: true } },
    },
  });
  if (!target) return;

  const recipientIds = new Set<string>();
  recipientIds.add(target.ownerId);
  for (const m of target.managers) recipientIds.add(m.userId);

  const sender = await prisma.team.findUnique({
    where: { id: input.fromTeamId },
    select: { users: { select: { battletag: true } } },
  });
  const rosterEntries: { battletag: string; tsr: number | null }[] = [];
  for (const u of sender?.users ?? []) {
    if (!u.battletag) continue;
    const snap = await getPlayerTsrByBattletag([u.battletag]);
    rosterEntries.push({ battletag: u.battletag, tsr: snap?.rating ?? null });
  }
  rosterEntries.sort((a, b) => (b.tsr ?? -Infinity) - (a.tsr ?? -Infinity));
  const fromRoster = rosterEntries.slice(0, 5);

  await Promise.allSettled([
    ...Array.from(recipientIds).map((userId) =>
      notifications
        .createInAppNotification({
          userId,
          title: `${input.fromTeamName} wants to scrim`,
          description: input.message,
          href: `/team/${input.fromTeamId}`,
        })
        .catch((err) => {
          Logger.error("Matchmaker in-app notification failed", {
            userId,
            error: err instanceof Error ? err.message : String(err),
          });
        })
    ),
    sendScrimRequestNotification(input.toTeamId, {
      event: "scrim.request",
      data: {
        fromTeamId: input.fromTeamId,
        fromTeamName: input.fromTeamName,
        fromBracketLabel: input.fromBracketLabel,
        fromTsr: input.fromTsr,
        toTsr: input.toTsr,
        fromRoster,
        message: input.message,
        teamId: input.toTeamId,
      },
    }),
  ]);
}

import { auditLog } from "@/lib/audit-logs";
import { auth, canEditScrim, getCurrentUser } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import { revalidateScrim, revalidateTeamStats } from "@/lib/cache-tags";
import { notifications } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const id = params.get("id");

  const session = await auth();

  if (!session?.user?.email) {
    Logger.warn("Unauthorized request to remove scrim: ", id);
    unauthorized();
  }

  const user = await getCurrentUser();

  if (!user) return new Response("User not found", { status: 404 });
  if (!id) return new Response("Missing ID", { status: 400 });

  const scrim = await prisma.scrim.findUnique({ where: { id: parseInt(id) } });

  if (!scrim) return new Response("Scrim not found", { status: 404 });

  if (!(await canEditScrim(scrim.id, user))) unauthorized();

  const scrimId = parseInt(id);

  // If not an individual scrim, create a notification for the team
  if (scrim.teamId !== 0 && scrim.teamId !== null) {
    const team = await prisma.team.findFirst({
      where: { id: scrim.teamId ?? 0 },
    });
    if (!team) return new Response("Team not found", { status: 404 });

    const teamMembers = await prisma.user.findMany({
      where: { teams: { some: { id: scrim.teamId ?? 0 } } },
    });

    for (const member of teamMembers) {
      await notifications.createInAppNotification({
        userId: member.id,
        title: `${team.name}: Scrim ${scrim.name} has been deleted`,
        description: `Scrim "${scrim.name}" has been deleted by ${user.name}.`,
      });
    }
  }

  await prisma.map.deleteMany({ where: { scrimId } });
  await prisma.scrim.delete({ where: { id: scrimId } });

  revalidateScrim(scrimId);
  if (scrim.teamId) revalidateTeamStats(scrim.teamId);

  after(async () => {
    await auditLog.createAuditLog({
      userEmail: user.email,
      action: "SCRIM_DELETED",
      target: `${scrim.name} (Team: ${scrim.teamId ?? "Individual"})`,
      details: `Scrim deleted: ${id}`,
    });
  });

  return new Response("OK", { status: 200 });
}

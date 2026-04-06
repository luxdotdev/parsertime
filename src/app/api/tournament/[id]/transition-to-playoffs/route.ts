import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { transitionToPlayoffs } from "@/lib/tournaments/round-robin";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    Logger.warn("Unauthorized request to transition to playoffs");
    unauthorized();
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr);
  if (isNaN(id)) {
    return Response.json({ error: "Invalid tournament ID" }, { status: 400 });
  }

  try {
    const tournament = await prisma.tournament.findUnique({ where: { id } });

    if (!tournament) {
      return Response.json({ error: "Tournament not found" }, { status: 404 });
    }

    if (tournament.format !== "ROUND_ROBIN_SE") {
      return Response.json(
        { error: "Tournament is not a round robin format" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });
    if (
      user?.id !== tournament.creatorId &&
      user?.role !== "ADMIN" &&
      user?.role !== "MANAGER"
    ) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const totalRR = await prisma.tournamentMatch.count({
      where: { tournamentId: id, round: { bracket: "ROUND_ROBIN" } },
    });
    const completedRR = await prisma.tournamentMatch.count({
      where: {
        tournamentId: id,
        round: { bracket: "ROUND_ROBIN" },
        status: "COMPLETED",
      },
    });

    if (completedRR < totalRR) {
      return Response.json(
        {
          error: `${totalRR - completedRR} round robin matches still incomplete`,
        },
        { status: 400 }
      );
    }

    await transitionToPlayoffs(id);

    after(async () => {
      await auditLog.createAuditLog({
        userEmail: session.user.email,
        action: "TOURNAMENT_UPDATED",
        target: id.toString(),
        details: "Transitioned to playoff bracket",
      });
    });

    return Response.json({ success: true });
  } catch (e) {
    Logger.error("Error transitioning to playoffs", e);
    return Response.json(
      { error: "Failed to transition to playoffs" },
      { status: 500 }
    );
  }
}

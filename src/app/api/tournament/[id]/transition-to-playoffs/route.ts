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
  const startTime = Date.now();
  const event: Record<string, unknown> = {
    route: "tournament.transitionToPlayoffs",
    method: "POST",
  };

  try {
    const session = await auth();
    if (!session?.user?.email) {
      event.outcome = "unauthorized";
      unauthorized();
    }
    event.userEmail = session.user.email;

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    event.tournamentId = id;
    if (isNaN(id)) {
      event.outcome = "invalid_id";
      event.statusCode = 400;
      return Response.json({ error: "Invalid tournament ID" }, { status: 400 });
    }

    const tournament = await prisma.tournament.findUnique({ where: { id } });

    if (!tournament) {
      event.outcome = "not_found";
      event.statusCode = 404;
      return Response.json({ error: "Tournament not found" }, { status: 404 });
    }

    if (tournament.format !== "ROUND_ROBIN_SE") {
      event.outcome = "wrong_format";
      event.statusCode = 400;
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
      event.outcome = "forbidden";
      event.statusCode = 403;
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

    event.totalRRMatches = totalRR;
    event.completedRRMatches = completedRR;

    if (completedRR < totalRR) {
      event.outcome = "incomplete_matches";
      event.statusCode = 400;
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

    event.outcome = "success";
    event.statusCode = 200;
    return Response.json({ success: true });
  } catch (e) {
    event.outcome = "error";
    event.statusCode = 500;
    event.error = e instanceof Error ? e.message : String(e);
    return Response.json(
      { error: "Failed to transition to playoffs" },
      { status: 500 }
    );
  } finally {
    event.durationMs = Date.now() - startTime;
    const logFn = event.outcome === "error" ? (e: Record<string, unknown>) => Logger.error(e) : (e: Record<string, unknown>) => Logger.info(e);
    logFn(event);
  }
}

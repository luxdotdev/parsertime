import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { TournamentStatus } from "@prisma/client";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";
import { z } from "zod";

const updateTournamentSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  status: z.nativeEnum(TournamentStatus).optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const event: Record<string, unknown> = {
    route: "tournament.update",
    method: "PATCH",
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

    const body = await req.json();
    const parsed = updateTournamentSchema.safeParse(body);
    if (!parsed.success) {
      event.outcome = "validation_error";
      event.statusCode = 400;
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      event.outcome = "not_found";
      event.statusCode = 404;
      return Response.json({ error: "Tournament not found" }, { status: 404 });
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

    const { status, name, startDate, endDate } = parsed.data;
    if (status) {
      event.statusChange = `${tournament.status} -> ${status}`;

      const validTransitions: Record<TournamentStatus, TournamentStatus[]> = {
        DRAFT: ["ACTIVE", "CANCELLED"],
        ACTIVE: ["COMPLETED", "CANCELLED"],
        COMPLETED: [],
        CANCELLED: ["DRAFT"],
      };

      if (!validTransitions[tournament.status].includes(status)) {
        event.outcome = "invalid_transition";
        event.statusCode = 400;
        return Response.json(
          {
            error: `Cannot transition from ${tournament.status} to ${status}`,
          },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.tournament.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(status !== undefined && { status }),
        ...(startDate !== undefined && {
          startDate: startDate ? new Date(startDate) : null,
        }),
        ...(endDate !== undefined && {
          endDate: endDate ? new Date(endDate) : null,
        }),
      },
    });

    after(async () => {
      const changes: string[] = [];
      if (name) changes.push(`name → "${name}"`);
      if (status) changes.push(`status → ${status}`);

      await auditLog.createAuditLog({
        userEmail: session.user.email,
        action: "TOURNAMENT_UPDATED",
        target: id.toString(),
        details: `Updated tournament: ${changes.join(", ")}`,
      });
    });

    event.outcome = "success";
    event.statusCode = 200;
    return Response.json(updated);
  } catch (e) {
    event.outcome = "error";
    event.statusCode = 500;
    event.error = e instanceof Error ? e.message : String(e);
    return Response.json(
      { error: "Failed to update tournament" },
      { status: 500 }
    );
  } finally {
    event.durationMs = Date.now() - startTime;
    const logFn = event.outcome === "error" ? (e: Record<string, unknown>) => Logger.error(e) : (e: Record<string, unknown>) => Logger.info(e);
    logFn(event);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const event: Record<string, unknown> = {
    route: "tournament.delete",
    method: "DELETE",
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

    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      event.outcome = "not_found";
      event.statusCode = 404;
      return Response.json({ error: "Tournament not found" }, { status: 404 });
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

    event.action = "cancel";
    event.statusChange = `${tournament.status} -> CANCELLED`;

    await prisma.tournament.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    after(async () => {
      await auditLog.createAuditLog({
        userEmail: session.user.email,
        action: "TOURNAMENT_DELETED",
        target: id.toString(),
        details: `Cancelled tournament "${tournament.name}"`,
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
      { error: "Failed to delete tournament" },
      { status: 500 }
    );
  } finally {
    event.durationMs = Date.now() - startTime;
    const logFn = event.outcome === "error" ? (e: Record<string, unknown>) => Logger.error(e) : (e: Record<string, unknown>) => Logger.info(e);
    logFn(event);
  }
}

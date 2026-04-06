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
  const session = await auth();
  if (!session?.user?.email) {
    Logger.warn("Unauthorized request to update tournament");
    unauthorized();
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr);
  if (isNaN(id)) {
    return Response.json({ error: "Invalid tournament ID" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = updateTournamentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      return Response.json({ error: "Tournament not found" }, { status: 404 });
    }

    // Check permissions: tournament creator or admin
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

    // Validate status transitions
    const { status, name, startDate, endDate } = parsed.data;
    if (status) {
      const validTransitions: Record<TournamentStatus, TournamentStatus[]> = {
        DRAFT: ["ACTIVE", "CANCELLED"],
        ACTIVE: ["COMPLETED", "CANCELLED"],
        COMPLETED: [],
        CANCELLED: ["DRAFT"],
      };

      if (!validTransitions[tournament.status].includes(status)) {
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

    return Response.json(updated);
  } catch (e) {
    Logger.error("Error updating tournament", e);
    return Response.json(
      { error: "Failed to update tournament" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    Logger.warn("Unauthorized request to delete tournament");
    unauthorized();
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr);
  if (isNaN(id)) {
    return Response.json({ error: "Invalid tournament ID" }, { status: 400 });
  }

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
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
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete: set to CANCELLED
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

    return Response.json({ success: true });
  } catch (e) {
    Logger.error("Error deleting tournament", e);
    return Response.json(
      { error: "Failed to delete tournament" },
      { status: 500 }
    );
  }
}

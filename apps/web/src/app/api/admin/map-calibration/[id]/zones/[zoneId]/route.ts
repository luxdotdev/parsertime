import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { dataLabeling } from "@/lib/flags";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { forbidden, unauthorized } from "next/navigation";
import { NextResponse } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ id: string; zoneId: string }> };

const VertexSchema = z.tuple([z.number(), z.number()]);
const UpdateZoneSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  category: z.enum(["POINT", "LANE"]).optional(),
  laneRole: z.enum(["MAIN", "FLANK"]).nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  vertices: z.array(VertexSchema).min(3).max(200).optional(),
});

export async function PATCH(req: Request, props: Params) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "PATCH",
    path: "/api/admin/map-calibration/[id]/zones/[zoneId]",
    timestamp: new Date().toISOString(),
  };

  try {
    const { id, zoneId } = await props.params;
    const user = await getCurrentUser();
    if (!user) unauthorized();
    if (!isAdminUser(user)) forbidden();

    const enabled = await dataLabeling();
    if (!enabled) forbidden();

    const parsedBody = UpdateZoneSchema.safeParse(await req.json());
    if (!parsedBody.success) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "validation_error";
      return NextResponse.json(
        { error: "Invalid request", details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }
    const numericId = parseInt(id, 10);
    const numericZoneId = parseInt(zoneId, 10);
    const body = parsedBody.data;
    wideEvent.user = { id: user.id, email: user.email };
    wideEvent.calibration_id = numericId;
    wideEvent.zone_id = numericZoneId;

    const existing = await prisma.mapZone.findFirst({
      where: { id: numericZoneId, calibrationId: numericId },
    });
    if (!existing) {
      wideEvent.status_code = 404;
      wideEvent.outcome = "not_found";
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    const zone = await prisma.mapZone.update({
      where: { id: existing.id },
      data: {
        ...body,
        vertices:
          body.vertices !== undefined
            ? (body.vertices as unknown as Prisma.InputJsonValue)
            : undefined,
      },
    });

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";

    return NextResponse.json(zone);
  } catch (error) {
    wideEvent.status_code = 500;
    wideEvent.outcome = "error";
    wideEvent.error = {
      message: error instanceof Error ? error.message : "Unknown error",
      type: error instanceof Error ? error.name : "Error",
    };
    throw error;
  } finally {
    wideEvent.duration_ms = Date.now() - startTime;
    Logger.info(wideEvent);
  }
}

export async function DELETE(_req: Request, props: Params) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "DELETE",
    path: "/api/admin/map-calibration/[id]/zones/[zoneId]",
    timestamp: new Date().toISOString(),
  };

  try {
    const { id, zoneId } = await props.params;
    const user = await getCurrentUser();
    if (!user) unauthorized();
    if (!isAdminUser(user)) forbidden();

    const enabled = await dataLabeling();
    if (!enabled) forbidden();

    const numericId = parseInt(id, 10);
    const numericZoneId = parseInt(zoneId, 10);
    wideEvent.user = { id: user.id, email: user.email };
    wideEvent.calibration_id = numericId;
    wideEvent.zone_id = numericZoneId;

    const existing = await prisma.mapZone.findFirst({
      where: { id: numericZoneId, calibrationId: numericId },
    });
    if (!existing) {
      wideEvent.status_code = 404;
      wideEvent.outcome = "not_found";
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    await prisma.mapZone.delete({ where: { id: existing.id } });

    wideEvent.status_code = 204;
    wideEvent.outcome = "success";

    return new Response(null, { status: 204 });
  } catch (error) {
    wideEvent.status_code = 500;
    wideEvent.outcome = "error";
    wideEvent.error = {
      message: error instanceof Error ? error.message : "Unknown error",
      type: error instanceof Error ? error.name : "Error",
    };
    throw error;
  } finally {
    wideEvent.duration_ms = Date.now() - startTime;
    Logger.info(wideEvent);
  }
}

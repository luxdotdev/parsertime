import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { dataLabeling } from "@/lib/flags";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { forbidden, unauthorized } from "next/navigation";
import { NextResponse } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const VertexSchema = z.tuple([z.number(), z.number()]);
const CreateZoneSchema = z.object({
  name: z.string().min(1).max(64),
  category: z.enum(["POINT", "LANE"]),
  laneRole: z.enum(["MAIN", "FLANK"]).nullable().optional(),
  vertices: z.array(VertexSchema).min(3).max(200),
});

export async function GET(_req: Request, props: Params) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "GET",
    path: "/api/admin/map-calibration/[id]/zones",
    timestamp: new Date().toISOString(),
  };

  try {
    const { id } = await props.params;
    const user = await getCurrentUser();
    if (!user) unauthorized();
    if (!isAdminUser(user)) forbidden();

    const enabled = await dataLabeling();
    if (!enabled) forbidden();

    wideEvent.user = { id: user.id, email: user.email };
    wideEvent.calibration_id = parseInt(id, 10);

    const zones = await prisma.mapZone.findMany({
      where: { calibrationId: parseInt(id, 10) },
      orderBy: [{ category: "asc" }, { id: "asc" }],
    });

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";
    wideEvent.zone_count = zones.length;

    return NextResponse.json(zones);
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

export async function POST(req: Request, props: Params) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "POST",
    path: "/api/admin/map-calibration/[id]/zones",
    timestamp: new Date().toISOString(),
  };

  try {
    const [{ id }, rawBody] = await Promise.all([props.params, req.json()]);
    const parsedBody = CreateZoneSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "validation_error";
      return NextResponse.json(
        { error: "Invalid request", details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }
    const user = await getCurrentUser();
    if (!user) unauthorized();
    if (!isAdminUser(user)) forbidden();

    const enabled = await dataLabeling();
    if (!enabled) forbidden();

    const numericId = parseInt(id, 10);
    const body = parsedBody.data;
    wideEvent.user = { id: user.id, email: user.email };
    wideEvent.calibration_id = numericId;
    wideEvent.category = body.category;

    const zone = await prisma.mapZone.create({
      data: {
        calibrationId: numericId,
        name: body.name,
        category: body.category,
        laneRole: body.laneRole ?? null,
        vertices: body.vertices as unknown as Prisma.InputJsonValue,
        status: "DRAFT",
        source: "MANUAL",
        createdBy: user.id,
      },
    });

    wideEvent.status_code = 201;
    wideEvent.outcome = "success";
    wideEvent.zone_id = zone.id;

    return NextResponse.json(zone, { status: 201 });
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

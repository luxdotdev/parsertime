import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
import { forbidden, unauthorized } from "next/navigation";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, props: Params) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "GET",
    path: "/api/admin/map-calibration/[id]/anchors",
    timestamp: new Date().toISOString(),
  };

  try {
    const session = await auth();
    if (!session) unauthorized();

    const user = await getUser(session.user.email);
    if (!user) unauthorized();
    if (user.role !== $Enums.UserRole.ADMIN) forbidden();

    wideEvent.user = { id: user.id, email: user.email };

    const { id } = await props.params;
    wideEvent.calibration_id = parseInt(id, 10);

    const anchors = await prisma.mapCalibrationAnchor.findMany({
      where: { calibrationId: parseInt(id, 10) },
      orderBy: { id: "asc" },
    });

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";
    wideEvent.anchor_count = anchors.length;

    return NextResponse.json(anchors);
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
    path: "/api/admin/map-calibration/[id]/anchors",
    timestamp: new Date().toISOString(),
  };

  try {
    const session = await auth();
    if (!session) unauthorized();

    const user = await getUser(session.user.email);
    if (!user) unauthorized();
    if (user.role !== $Enums.UserRole.ADMIN) forbidden();

    wideEvent.user = { id: user.id, email: user.email };

    const { id } = await props.params;
    wideEvent.calibration_id = parseInt(id, 10);

    const body = (await req.json()) as {
      worldX: number;
      worldY: number;
      imageU: number;
      imageV: number;
      label?: string;
    };

    wideEvent.anchor_world = { x: body.worldX, y: body.worldY };
    wideEvent.anchor_image = { u: body.imageU, v: body.imageV };
    wideEvent.anchor_label = body.label ?? null;

    const anchor = await prisma.mapCalibrationAnchor.create({
      data: {
        calibrationId: parseInt(id, 10),
        worldX: body.worldX,
        worldY: body.worldY,
        imageU: body.imageU,
        imageV: body.imageV,
        label: body.label ?? null,
      },
    });

    wideEvent.status_code = 201;
    wideEvent.outcome = "success";
    wideEvent.result = { anchor_id: anchor.id };

    return NextResponse.json(anchor, { status: 201 });
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

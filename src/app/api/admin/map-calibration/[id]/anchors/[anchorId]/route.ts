import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { dataLabeling } from "@/lib/flags";
import { forbidden, unauthorized } from "next/navigation";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string; anchorId: string }> };

async function verifyOwnership(calibrationId: string, anchorId: string) {
  const anchor = await prisma.mapCalibrationAnchor.findUnique({
    where: { id: parseInt(anchorId, 10) },
    select: { calibrationId: true },
  });

  if (
    !anchor?.calibrationId ||
    anchor.calibrationId !== parseInt(calibrationId, 10)
  ) {
    return null;
  }
  return anchor;
}

export async function PUT(req: Request, props: Params) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "PUT",
    path: "/api/admin/map-calibration/[id]/anchors/[anchorId]",
    timestamp: new Date().toISOString(),
  };

  try {
    const session = await auth();
    if (!session) unauthorized();

    const user = await getUser(session.user.email);
    if (!user) unauthorized();

    const enabled = await dataLabeling();
    if (!enabled) forbidden();

    wideEvent.user = { id: user.id, email: user.email };

    const { id, anchorId } = await props.params;
    wideEvent.calibration_id = parseInt(id, 10);
    wideEvent.anchor_id = parseInt(anchorId, 10);

    const existing = await verifyOwnership(id, anchorId);
    if (!existing) {
      wideEvent.status_code = 404;
      wideEvent.outcome = "not_found";
      return NextResponse.json({ error: "Anchor not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      worldX?: number;
      worldY?: number;
      imageU?: number;
      imageV?: number;
      label?: string | null;
    };

    const anchor = await prisma.mapCalibrationAnchor.update({
      where: { id: parseInt(anchorId, 10) },
      data: body,
    });

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";

    return NextResponse.json(anchor);
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
    path: "/api/admin/map-calibration/[id]/anchors/[anchorId]",
    timestamp: new Date().toISOString(),
  };

  try {
    const session = await auth();
    if (!session) unauthorized();

    const user = await getUser(session.user.email);
    if (!user) unauthorized();

    const enabled = await dataLabeling();
    if (!enabled) forbidden();

    wideEvent.user = { id: user.id, email: user.email };

    const { id, anchorId } = await props.params;
    wideEvent.calibration_id = parseInt(id, 10);
    wideEvent.anchor_id = parseInt(anchorId, 10);

    const existing = await verifyOwnership(id, anchorId);
    if (!existing) {
      wideEvent.status_code = 404;
      wideEvent.outcome = "not_found";
      return NextResponse.json({ error: "Anchor not found" }, { status: 404 });
    }

    await prisma.mapCalibrationAnchor.delete({
      where: { id: parseInt(anchorId, 10) },
    });

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

import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { computeMapTransform } from "@/lib/map-calibration/compute-transform";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
import { forbidden, unauthorized } from "next/navigation";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "POST",
    path: "/api/admin/map-calibration/compute-transform",
    timestamp: new Date().toISOString(),
  };

  try {
    const session = await auth();
    if (!session) unauthorized();

    const user = await getUser(session.user.email);
    if (!user) unauthorized();
    if (user.role !== $Enums.UserRole.ADMIN) forbidden();

    wideEvent.user = { id: user.id, email: user.email };

    const body = (await req.json()) as { calibrationId: number };
    wideEvent.calibration_id = body.calibrationId;

    const calibration = await prisma.mapCalibration.findUnique({
      where: { id: body.calibrationId },
      include: { anchors: true },
    });

    if (!calibration) {
      wideEvent.status_code = 404;
      wideEvent.outcome = "not_found";
      return NextResponse.json(
        { error: "Calibration not found" },
        { status: 404 }
      );
    }

    wideEvent.map_name = calibration.mapName;
    wideEvent.anchor_count = calibration.anchors.length;

    if (calibration.anchors.length < 2) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "insufficient_anchors";
      return NextResponse.json(
        { error: "At least 2 anchor points are required" },
        { status: 400 }
      );
    }

    const { transform, residualError } = computeMapTransform(
      calibration.anchors,
      calibration.imageHeight
    );

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";
    wideEvent.transform = {
      scale: transform.scale,
      rotation_deg: (transform.rotation * 180) / Math.PI,
    };
    wideEvent.residual_error_px = residualError;

    return NextResponse.json({ transform, residualError });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Transform computation failed";

    if (wideEvent.status_code === undefined) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "computation_error";
    }
    wideEvent.error = {
      message,
      type: error instanceof Error ? error.name : "Error",
    };

    return NextResponse.json({ error: message }, { status: 400 });
  } finally {
    wideEvent.duration_ms = Date.now() - startTime;
    Logger.info(wideEvent);
  }
}

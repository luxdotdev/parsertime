import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { dataLabeling } from "@/lib/flags";
import { r2 } from "@/lib/r2";
import { forbidden, unauthorized } from "next/navigation";
import { NextResponse } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const UpdateMapCalibrationSchema = z.object({
  affineA: z.number().finite().nullable().optional(),
  affineB: z.number().finite().nullable().optional(),
  affineC: z.number().finite().nullable().optional(),
  affineD: z.number().finite().nullable().optional(),
  affineTx: z.number().finite().nullable().optional(),
  affineTy: z.number().finite().nullable().optional(),
  imageUrl: z.string().min(1).max(2048).optional(),
  imageWidth: z.number().int().positive().optional(),
  imageHeight: z.number().int().positive().optional(),
  displayImageKey: z.string().min(1).max(2048).optional(),
});

export async function GET(_req: Request, props: Params) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "GET",
    path: "/api/admin/map-calibration/[id]",
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

    const calibration = await prisma.mapCalibration.findUnique({
      where: { id: parseInt(id, 10) },
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

    const imagePresignedUrl = await r2.getPresignedUrl({
      key: calibration.imageUrl,
      expiresIn: 3600,
    });

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";
    wideEvent.map_name = calibration.mapName;
    wideEvent.anchor_count = calibration.anchors.length;

    return NextResponse.json({
      ...calibration,
      imagePresignedUrl,
    });
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

export async function PUT(req: Request, props: Params) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "PUT",
    path: "/api/admin/map-calibration/[id]",
    timestamp: new Date().toISOString(),
  };

  try {
    const [{ id }, rawBody] = await Promise.all([props.params, req.json()]);
    const parsedBody = UpdateMapCalibrationSchema.safeParse(rawBody);
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
    const updateData = {
      affineA: body.affineA,
      affineB: body.affineB,
      affineC: body.affineC,
      affineD: body.affineD,
      affineTx: body.affineTx,
      affineTy: body.affineTy,
      imageUrl: body.imageUrl,
      imageWidth: body.imageWidth,
      imageHeight: body.imageHeight,
      displayImageKey: body.displayImageKey,
    };
    wideEvent.user = { id: user.id, email: user.email };
    wideEvent.calibration_id = numericId;

    // Anchors are in pixel coordinates — replacing the image invalidates them
    const imageChanged =
      body.imageUrl !== undefined ||
      body.imageWidth !== undefined ||
      body.imageHeight !== undefined;

    const isTransformUpdate =
      body.affineA !== undefined || body.affineTx !== undefined;

    wideEvent.update_type = imageChanged
      ? "image_replace"
      : isTransformUpdate
        ? "transform_save"
        : "metadata";

    if (imageChanged && !isTransformUpdate) {
      const calibration = await prisma.$transaction(async (tx) => {
        await tx.mapCalibrationAnchor.deleteMany({
          where: { calibrationId: numericId },
        });
        return tx.mapCalibration.update({
          where: { id: numericId },
          data: {
            ...updateData,
            affineA: null,
            affineB: null,
            affineC: null,
            affineD: null,
            affineTx: null,
            affineTy: null,
          },
          include: { anchors: true },
        });
      });

      wideEvent.status_code = 200;
      wideEvent.outcome = "success";
      wideEvent.anchors_cleared = true;
      wideEvent.map_name = calibration.mapName;

      return NextResponse.json(calibration);
    }

    const calibration = await prisma.mapCalibration.update({
      where: { id: numericId },
      data: updateData,
      include: { anchors: true },
    });

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";
    wideEvent.map_name = calibration.mapName;

    return NextResponse.json(calibration);
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
    path: "/api/admin/map-calibration/[id]",
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

    const calibration = await prisma.mapCalibration.findUnique({
      where: { id: parseInt(id, 10) },
      select: { imageUrl: true, displayImageKey: true },
    });

    await prisma.mapCalibration.delete({
      where: { id: parseInt(id, 10) },
    });

    if (calibration) {
      void Promise.allSettled([
        r2.delete(calibration.imageUrl),
        calibration.displayImageKey
          ? r2.delete(calibration.displayImageKey)
          : Promise.resolve(),
      ]);
    }

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

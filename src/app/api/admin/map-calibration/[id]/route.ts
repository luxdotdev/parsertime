import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { dataLabeling } from "@/lib/flags";
import { r2 } from "@/lib/r2";
import { forbidden, unauthorized } from "next/navigation";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, props: Params) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "GET",
    path: "/api/admin/map-calibration/[id]",
    timestamp: new Date().toISOString(),
  };

  try {
    const [session, { id }] = await Promise.all([auth(), props.params]);
    if (!session) unauthorized();

    const user = await AppRuntime.runPromise(
      UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
    );
    if (!user) unauthorized();

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
    const [session, { id }, body] = await Promise.all([
      auth(),
      props.params,
      req.json() as Promise<{
        affineA?: number | null;
        affineB?: number | null;
        affineC?: number | null;
        affineD?: number | null;
        affineTx?: number | null;
        affineTy?: number | null;
        imageUrl?: string;
        imageWidth?: number;
        imageHeight?: number;
        displayImageKey?: string;
      }>,
    ]);
    if (!session) unauthorized();

    const user = await AppRuntime.runPromise(
      UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
    );
    if (!user) unauthorized();

    const enabled = await dataLabeling();
    if (!enabled) forbidden();

    const numericId = parseInt(id, 10);
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
            ...body,
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
      data: body,
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
    const [session, { id }] = await Promise.all([auth(), props.params]);
    if (!session) unauthorized();

    const user = await AppRuntime.runPromise(
      UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
    );
    if (!user) unauthorized();

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

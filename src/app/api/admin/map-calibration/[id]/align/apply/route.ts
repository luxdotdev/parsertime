import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { dataLabeling } from "@/lib/flags";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { remapCalibration } from "@/lib/map-calibration/remap";
import type { PixelAffine } from "@/lib/map-calibration/types";
import { r2 } from "@/lib/r2";
import { forbidden, unauthorized } from "next/navigation";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

const ApplySchema = z.object({
  pixelAffine: z.object({
    a: z.number().finite(),
    b: z.number().finite(),
    c: z.number().finite(),
    d: z.number().finite(),
    tx: z.number().finite(),
    ty: z.number().finite(),
  }),
  stagedOriginalKey: z.string().min(1).max(2048),
  stagedDisplayKey: z.string().min(1).max(2048),
  newWidth: z.number().int().positive(),
  newHeight: z.number().int().positive(),
});

function slugForMapName(mapName: string) {
  return mapName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export async function POST(request: Request, props: Params) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "POST",
    path: "/api/admin/map-calibration/[id]/align/apply",
    timestamp: new Date().toISOString(),
  };

  try {
    const [{ id }, rawBody] = await Promise.all([props.params, request.json()]);
    const parsed = ApplySchema.safeParse(rawBody);
    if (!parsed.success) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "validation_error";
      wideEvent.error = { message: "Invalid request" };
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    if (!user) unauthorized();
    if (!isAdminUser(user)) forbidden();
    if (!(await dataLabeling())) forbidden();

    const numericId = parseInt(id, 10);
    const body = parsed.data;
    wideEvent.user = { id: user.id, email: user.email };
    wideEvent.calibration_id = numericId;

    const calibration = await prisma.mapCalibration.findUnique({
      where: { id: numericId },
      include: { anchors: true },
    });
    if (!calibration) {
      wideEvent.status_code = 404;
      wideEvent.outcome = "not_found";
      wideEvent.error = { message: "Calibration not found" };
      return NextResponse.json(
        { error: "Calibration not found" },
        { status: 404 }
      );
    }
    if (calibration.anchors.length < 3) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "error";
      wideEvent.error = { message: "Map needs at least 3 anchors to re-align" };
      return NextResponse.json(
        { error: "Map needs at least 3 anchors to re-align" },
        { status: 400 }
      );
    }

    const slug = slugForMapName(calibration.mapName);
    const stagedPrefix = `map-images/${slug}/staging-`;
    if (
      !body.stagedOriginalKey.startsWith(stagedPrefix) ||
      !body.stagedDisplayKey.startsWith(stagedPrefix)
    ) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "error";
      wideEvent.error = { message: "Staged keys do not match map" };
      return NextResponse.json(
        { error: "Staged keys do not match map" },
        { status: 400 }
      );
    }

    // Compute the remap up front; if anchors are degenerate this throws before
    // any destructive R2/DB work.
    const remap = remapCalibration(
      calibration.anchors,
      body.pixelAffine as PixelAffine
    );

    const liveOriginal = `map-images/${slug}/original.png`;
    const liveDisplay = `map-images/${slug}/display.png`;
    const backupOriginal = `map-images/${slug}/backup-original.png`;
    const backupDisplay = `map-images/${slug}/backup-display.png`;
    const backupSnapshot = `map-images/${slug}/backup-calibration.json`;

    // 1) Back up the current live image + a JSON snapshot of prior calibration.
    const [curOriginal, curDisplaySettled] = await Promise.all([
      r2.download(calibration.imageUrl),
      calibration.displayImageKey
        ? r2.download(calibration.displayImageKey)
        : Promise.resolve(null),
    ]);
    const snapshot = {
      version: 1,
      savedAt: new Date().toISOString(),
      imageUrl: calibration.imageUrl,
      displayImageKey: calibration.displayImageKey,
      imageWidth: calibration.imageWidth,
      imageHeight: calibration.imageHeight,
      affine: {
        a: calibration.affineA,
        b: calibration.affineB,
        c: calibration.affineC,
        d: calibration.affineD,
        tx: calibration.affineTx,
        ty: calibration.affineTy,
      },
      anchors: calibration.anchors.map((a) => ({
        id: a.id,
        worldX: a.worldX,
        worldY: a.worldY,
        imageU: a.imageU,
        imageV: a.imageV,
        label: a.label,
      })),
    };
    await Promise.all([
      r2.upload({
        key: backupOriginal,
        body: curOriginal,
        contentType: "image/png",
      }),
      curDisplaySettled
        ? r2.upload({
            key: backupDisplay,
            body: curDisplaySettled,
            contentType: "image/png",
          })
        : Promise.resolve(),
      r2.upload({
        key: backupSnapshot,
        body: Buffer.from(JSON.stringify(snapshot)),
        contentType: "application/json",
      }),
    ]);

    // 2) Promote staged bytes onto the canonical live keys.
    const [stagedOriginalBytes, stagedDisplayBytes] = await Promise.all([
      r2.download(body.stagedOriginalKey),
      r2.download(body.stagedDisplayKey),
    ]);
    await Promise.all([
      r2.upload({
        key: liveOriginal,
        body: stagedOriginalBytes,
        contentType: "image/png",
      }),
      r2.upload({
        key: liveDisplay,
        body: stagedDisplayBytes,
        contentType: "image/png",
      }),
    ]);

    // 3) Remap the DB atomically: update anchors + affine + dims.
    const t = remap.transform;
    await prisma.$transaction([
      ...remap.anchors.map((a) =>
        prisma.mapCalibrationAnchor.update({
          where: { id: a.id },
          data: { imageU: a.imageU, imageV: a.imageV },
        })
      ),
      prisma.mapCalibration.update({
        where: { id: numericId },
        data: {
          imageUrl: liveOriginal,
          displayImageKey: liveDisplay,
          imageWidth: body.newWidth,
          imageHeight: body.newHeight,
          affineA: t.a,
          affineB: t.b,
          affineC: t.c,
          affineD: t.d,
          affineTx: t.tx,
          affineTy: t.ty,
        },
      }),
    ]);

    // 4) Clean up staging (best-effort).
    void Promise.allSettled([
      r2.delete(body.stagedOriginalKey),
      r2.delete(body.stagedDisplayKey),
    ]);

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";
    wideEvent.map_name = calibration.mapName;
    wideEvent.residual = remap.residualError;

    return NextResponse.json({
      ok: true,
      residualError: remap.residualError,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "NEXT_UNAUTHORIZED" ||
        error.message === "NEXT_FORBIDDEN")
    ) {
      throw error;
    }
    wideEvent.status_code = 500;
    wideEvent.outcome = "error";
    wideEvent.error = {
      message: error instanceof Error ? error.message : "Unknown error",
      type: error instanceof Error ? error.name : "Error",
    };
    return NextResponse.json(
      { error: "An unknown error occurred" },
      { status: 500 }
    );
  } finally {
    wideEvent.duration_ms = Date.now() - startTime;
    Logger.info(wideEvent);
  }
}

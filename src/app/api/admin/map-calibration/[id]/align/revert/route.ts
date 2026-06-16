import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { dataLabeling } from "@/lib/flags";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { r2 } from "@/lib/r2";
import { forbidden, unauthorized } from "next/navigation";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

type Snapshot = {
  version: number;
  imageWidth: number;
  imageHeight: number;
  affine: {
    a: number | null;
    b: number | null;
    c: number | null;
    d: number | null;
    tx: number | null;
    ty: number | null;
  };
  anchors: {
    id: number;
    imageU: number;
    imageV: number;
  }[];
};

function slugForMapName(mapName: string) {
  return mapName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export async function POST(_request: Request, props: Params) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "POST",
    path: "/api/admin/map-calibration/[id]/align/revert",
    timestamp: new Date().toISOString(),
  };

  try {
    const { id } = await props.params;
    const user = await getCurrentUser();
    if (!user) unauthorized();
    if (!isAdminUser(user)) forbidden();
    if (!(await dataLabeling())) forbidden();

    const numericId = parseInt(id, 10);
    if (Number.isNaN(numericId)) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "error";
      wideEvent.error = { message: "Invalid calibration id" };
      return NextResponse.json(
        { error: "Invalid calibration id" },
        { status: 400 }
      );
    }
    wideEvent.user = { id: user.id, email: user.email };
    wideEvent.calibration_id = numericId;

    const calibration = await prisma.mapCalibration.findUnique({
      where: { id: numericId },
      select: { mapName: true },
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

    const slug = slugForMapName(calibration.mapName);
    const liveOriginal = `map-images/${slug}/original.png`;
    const liveDisplay = `map-images/${slug}/display.png`;
    const backupOriginal = `map-images/${slug}/backup-original.png`;
    const backupDisplay = `map-images/${slug}/backup-display.png`;
    const backupSnapshot = `map-images/${slug}/backup-calibration.json`;

    let snapshotBytes: Buffer;
    let backupOriginalBytes: Buffer;
    try {
      [snapshotBytes, backupOriginalBytes] = await Promise.all([
        r2.download(backupSnapshot),
        r2.download(backupOriginal),
      ]);
    } catch {
      wideEvent.status_code = 404;
      wideEvent.outcome = "no_backup";
      wideEvent.error = { message: "No backup available to revert" };
      return NextResponse.json(
        { error: "No backup available to revert" },
        { status: 404 }
      );
    }

    const snapshot = JSON.parse(snapshotBytes.toString()) as Snapshot;
    const backupDisplayBytes = await r2
      .download(backupDisplay)
      .catch(() => backupOriginalBytes);

    // Restore image bytes onto the live keys.
    await Promise.all([
      r2.upload({
        key: liveOriginal,
        body: backupOriginalBytes,
        contentType: "image/png",
      }),
      r2.upload({
        key: liveDisplay,
        body: backupDisplayBytes,
        contentType: "image/png",
      }),
    ]);

    // Restore the DB rows.
    await prisma.$transaction([
      ...snapshot.anchors.map((a) =>
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
          imageWidth: snapshot.imageWidth,
          imageHeight: snapshot.imageHeight,
          affineA: snapshot.affine.a,
          affineB: snapshot.affine.b,
          affineC: snapshot.affine.c,
          affineD: snapshot.affine.d,
          affineTx: snapshot.affine.tx,
          affineTy: snapshot.affine.ty,
        },
      }),
    ]);

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";
    wideEvent.map_name = calibration.mapName;
    return NextResponse.json({ ok: true });
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

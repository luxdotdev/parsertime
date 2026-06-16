import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { dataLabeling } from "@/lib/flags";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { r2 } from "@/lib/r2";
import { forbidden, unauthorized } from "next/navigation";
import { NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

function slugForMapName(mapName: string) {
  return mapName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function stagingKeys(slug: string) {
  return {
    original: `map-images/${slug}/staging-original.png`,
    display: `map-images/${slug}/staging-display.png`,
  };
}

export async function POST(request: Request, props: Params) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "POST",
    path: "/api/admin/map-calibration/[id]/align",
    timestamp: new Date().toISOString(),
  };

  try {
    const { id } = await props.params;
    const user = await getCurrentUser();
    if (!user) unauthorized();
    if (!isAdminUser(user)) forbidden();
    if (!(await dataLabeling())) forbidden();

    const numericId = parseInt(id, 10);
    wideEvent.user = { id: user.id, email: user.email };
    wideEvent.calibration_id = numericId;

    const body = (await request.json()) as { rawKey?: string };
    const rawKey = body.rawKey;
    if (!rawKey || typeof rawKey !== "string") {
      wideEvent.status_code = 400;
      wideEvent.outcome = "error";
      wideEvent.error = { message: "Missing rawKey" };
      return NextResponse.json({ error: "Missing rawKey" }, { status: 400 });
    }

    const calibration = await prisma.mapCalibration.findUnique({
      where: { id: numericId },
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

    const slug = slugForMapName(calibration.mapName);
    if (!rawKey.startsWith(`map-images/${slug}/raw-`)) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "error";
      wideEvent.error = { message: "rawKey does not match map" };
      return NextResponse.json(
        { error: "rawKey does not match map" },
        { status: 400 }
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

    // Process the raw upload into staging keys (mirrors the upload route).
    const buffer = await r2.download(rawKey);
    const metadata = await sharp(buffer).metadata();
    const newWidth = metadata.width;
    const newHeight = metadata.height;
    if (!newWidth || !newHeight) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "error";
      wideEvent.error = { message: "Could not determine image dimensions" };
      return NextResponse.json(
        { error: "Could not determine image dimensions" },
        { status: 400 }
      );
    }

    const pngBuffer = await sharp(buffer).png().toBuffer();
    const displayBuffer =
      newWidth > 2560
        ? await sharp(buffer).resize(2560).png().toBuffer()
        : pngBuffer;

    const keys = stagingKeys(slug);
    await r2.upload({
      key: keys.original,
      body: pngBuffer,
      contentType: "image/png",
    });
    await r2.upload({
      key: keys.display,
      body: displayBuffer,
      contentType: "image/png",
    });
    await r2.delete(rawKey);
    wideEvent.staged_keys = keys;

    // Presign OLD original + NEW staged original for the engine, plus the OLD
    // and NEW display images for the review UI's old↔new compare.
    const [oldUrl, newUrl, stagedDisplayUrl, oldDisplayUrl] = await Promise.all([
      r2.getPresignedUrl({ key: calibration.imageUrl, expiresIn: 600 }),
      r2.getPresignedUrl({ key: keys.original, expiresIn: 600 }),
      r2.getPresignedUrl({ key: keys.display, expiresIn: 3600 }),
      r2.getPresignedUrl({
        key: calibration.displayImageKey ?? calibration.imageUrl,
        expiresIn: 3600,
      }),
    ]);

    if (!process.env.CRON_SECRET) {
      wideEvent.status_code = 500;
      wideEvent.outcome = "engine_error";
      wideEvent.error = { message: "CRON_SECRET is not configured" };
      return NextResponse.json(
        { error: "Alignment engine failed" },
        { status: 500 }
      );
    }

    const origin = new URL(request.url).origin;
    const engineRes = await fetch(`${origin}/api/map-align`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({ oldUrl, newUrl }),
      signal: AbortSignal.timeout(50_000), // 50s — headroom under the 60s maxDuration
    });

    if (engineRes.status === 422) {
      const err = (await engineRes.json()) as { error: string };
      wideEvent.status_code = 422;
      wideEvent.outcome = "unalignable";
      wideEvent.error = { message: err.error };
      return NextResponse.json(
        { error: "Could not align automatically", reason: err.error },
        { status: 422 }
      );
    }
    if (!engineRes.ok) {
      wideEvent.status_code = 502;
      wideEvent.outcome = "engine_error";
      return NextResponse.json(
        { error: "Alignment engine failed" },
        { status: 502 }
      );
    }

    const engine = (await engineRes.json()) as {
      transform: number[][];
      inliers: number;
      residual: number;
    };
    const [r0, r1] = engine.transform;
    const pixelAffine = {
      a: r0[0],
      b: r0[1],
      tx: r0[2],
      c: r1[0],
      d: r1[1],
      ty: r1[2],
    };

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";
    wideEvent.map_name = calibration.mapName;
    wideEvent.inliers = engine.inliers;
    wideEvent.residual = engine.residual;

    return NextResponse.json({
      pixelAffine,
      inliers: engine.inliers,
      residual: engine.residual,
      stagedOriginalKey: keys.original,
      stagedDisplayKey: keys.display,
      stagedDisplayUrl,
      oldDisplayUrl,
      newWidth,
      newHeight,
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

export async function DELETE(_request: Request, props: Params) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "DELETE",
    path: "/api/admin/map-calibration/[id]/align",
    timestamp: new Date().toISOString(),
  };

  try {
    const { id } = await props.params;
    const user = await getCurrentUser();
    if (!user) unauthorized();
    if (!isAdminUser(user)) forbidden();
    if (!(await dataLabeling())) forbidden();

    const calibration = await prisma.mapCalibration.findUnique({
      where: { id: parseInt(id, 10) },
      select: { mapName: true },
    });
    if (calibration) {
      const keys = stagingKeys(slugForMapName(calibration.mapName));
      void Promise.allSettled([
        r2.delete(keys.original),
        r2.delete(keys.display),
      ]);
    }

    wideEvent.status_code = 204;
    wideEvent.outcome = "success";
    return new Response(null, { status: 204 });
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

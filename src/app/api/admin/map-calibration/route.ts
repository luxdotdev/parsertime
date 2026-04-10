import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { dataLabeling } from "@/lib/flags";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { forbidden, unauthorized } from "next/navigation";
import { NextResponse } from "next/server";

export async function GET() {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "GET",
    path: "/api/admin/map-calibration",
    timestamp: new Date().toISOString(),
  };

  try {
    const session = await auth();
    if (!session) unauthorized();

    const user = await AppRuntime.runPromise(
      UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
    );
    if (!user) unauthorized();

    const enabled = await dataLabeling();
    if (!enabled) forbidden();

    wideEvent.user = { id: user.id, email: user.email };

    const calibrations = await prisma.mapCalibration.findMany({
      include: { anchors: true },
      orderBy: { mapName: "asc" },
    });

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";
    wideEvent.result = { calibration_count: calibrations.length };

    return NextResponse.json(calibrations);
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

export async function POST(req: Request) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "POST",
    path: "/api/admin/map-calibration",
    timestamp: new Date().toISOString(),
  };

  try {
    const session = await auth();
    if (!session) unauthorized();

    const user = await AppRuntime.runPromise(
      UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
    );
    if (!user) unauthorized();

    const enabled = await dataLabeling();
    if (!enabled) forbidden();

    wideEvent.user = { id: user.id, email: user.email };

    const body = (await req.json()) as {
      mapName: string;
      imageUrl: string;
      imageWidth: number;
      imageHeight: number;
      displayImageKey?: string;
    };

    wideEvent.map_name = body.mapName;
    wideEvent.image_dimensions = {
      width: body.imageWidth,
      height: body.imageHeight,
    };

    const calibration = await prisma.mapCalibration.create({
      data: {
        mapName: body.mapName,
        imageUrl: body.imageUrl,
        imageWidth: body.imageWidth,
        imageHeight: body.imageHeight,
        createdBy: user.id,
        displayImageKey: body.displayImageKey ?? null,
      },
      include: { anchors: true },
    });

    wideEvent.status_code = 201;
    wideEvent.outcome = "success";
    wideEvent.result = { calibration_id: calibration.id };

    return NextResponse.json(calibration, { status: 201 });
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

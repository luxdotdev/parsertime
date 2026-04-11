import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { dataLabeling } from "@/lib/flags";
import { Logger } from "@/lib/logger";
import { r2 } from "@/lib/r2";
import { forbidden, unauthorized } from "next/navigation";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "POST",
    path: "/api/admin/map-calibration/upload/presign",
    timestamp: new Date().toISOString(),
  };

  try {
    const session = await auth();
    if (!session?.user) unauthorized();

    const user = await AppRuntime.runPromise(
      UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
    );
    if (!user) unauthorized();

    const enabled = await dataLabeling();
    if (!enabled) forbidden();

    wideEvent.user = { id: user.id, email: user.email };

    const body = (await request.json()) as {
      mapName?: string;
      contentType?: string;
    };

    const { mapName, contentType } = body;

    if (!mapName || typeof mapName !== "string" || mapName.trim() === "") {
      wideEvent.status_code = 400;
      wideEvent.outcome = "error";
      wideEvent.error = { message: "Missing or invalid mapName field" };
      return NextResponse.json(
        { error: "Missing or invalid mapName field" },
        { status: 400 }
      );
    }

    const slug = mapName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const rawKey = `map-images/${slug}/raw-${Date.now()}`;

    wideEvent.map_name = mapName;
    wideEvent.slug = slug;
    wideEvent.raw_key = rawKey;

    const uploadUrl = await r2.getPresignedUploadUrl({
      key: rawKey,
      contentType: contentType ?? "application/octet-stream",
      expiresIn: 3600,
    });

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";

    return NextResponse.json({ uploadUrl, rawKey, slug });
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
      {
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  } finally {
    wideEvent.duration_ms = Date.now() - startTime;
    Logger.info(wideEvent);
  }
}

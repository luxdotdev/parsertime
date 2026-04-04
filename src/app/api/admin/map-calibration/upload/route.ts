import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { dataLabeling } from "@/lib/flags";
import { Logger } from "@/lib/logger";
import { r2 } from "@/lib/r2";
import { forbidden, unauthorized } from "next/navigation";
import { NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request): Promise<NextResponse> {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "POST",
    path: "/api/admin/map-calibration/upload",
    timestamp: new Date().toISOString(),
  };

  try {
    const session = await auth();
    if (!session?.user) unauthorized();

    const user = await getUser(session.user.email);
    if (!user) unauthorized();

    const enabled = await dataLabeling();
    if (!enabled) forbidden();

    wideEvent.user = { id: user.id, email: user.email };

    const formData = await request.formData();
    const file = formData.get("file");
    const mapName = formData.get("mapName");

    if (!file || !(file instanceof File)) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "error";
      wideEvent.error = { message: "Missing or invalid file field" };
      return NextResponse.json(
        { error: "Missing or invalid file field" },
        { status: 400 }
      );
    }

    if (!mapName || typeof mapName !== "string" || mapName.trim() === "") {
      wideEvent.status_code = 400;
      wideEvent.outcome = "error";
      wideEvent.error = { message: "Missing or invalid mapName field" };
      return NextResponse.json(
        { error: "Missing or invalid mapName field" },
        { status: 400 }
      );
    }

    wideEvent.map_name = mapName;
    wideEvent.file_name = file.name;
    wideEvent.file_size = file.size;

    const buffer = Buffer.from(await file.arrayBuffer());

    const metadata = await sharp(buffer).metadata();
    const imageWidth = metadata.width;
    const imageHeight = metadata.height;

    if (!imageWidth || !imageHeight) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "error";
      wideEvent.error = { message: "Could not determine image dimensions" };
      return NextResponse.json(
        { error: "Could not determine image dimensions" },
        { status: 400 }
      );
    }

    wideEvent.image_dimensions = { width: imageWidth, height: imageHeight };

    const slug = mapName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    wideEvent.slug = slug;

    const pngBuffer = await sharp(buffer).png().toBuffer();

    const originalKey = `map-images/${slug}/original.png`;
    await r2.upload({
      key: originalKey,
      body: pngBuffer,
      contentType: "image/png",
    });

    const displayBuffer =
      imageWidth > 2560
        ? await sharp(buffer).resize(2560).png().toBuffer()
        : pngBuffer;

    const displayKey = `map-images/${slug}/display.png`;
    await r2.upload({
      key: displayKey,
      body: displayBuffer,
      contentType: "image/png",
    });

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";
    wideEvent.result = { original_key: originalKey, display_key: displayKey };

    return NextResponse.json({
      imageKey: originalKey,
      displayImageKey: displayKey,
      imageWidth,
      imageHeight,
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

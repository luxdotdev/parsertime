import { auth } from "@/lib/auth";
import { loadCalibration } from "@/lib/map-calibration/load-calibration";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mapName = searchParams.get("map");
  if (!mapName) {
    return NextResponse.json(
      { error: "Missing map parameter" },
      { status: 400 }
    );
  }

  const calibration = await loadCalibration(mapName);
  if (!calibration) {
    return NextResponse.json(
      { error: "No calibration found" },
      { status: 404 }
    );
  }

  return NextResponse.json(calibration);
}

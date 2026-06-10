import { ReplayService } from "@/data/map/replay";
import { AppRuntime } from "@/data/runtime";
import { auth, canViewMapData, getCurrentUser } from "@/lib/auth";
import { resolveMapDataId } from "@/lib/map-data-resolver";
import { Effect } from "effect";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mapDataIdParam = searchParams.get("mapDataId");
  if (!mapDataIdParam || Number.isNaN(parseInt(mapDataIdParam))) {
    return NextResponse.json({ error: "Missing mapDataId" }, { status: 400 });
  }

  const id = await resolveMapDataId(parseInt(mapDataIdParam));
  const user = await getCurrentUser();
  if (!(await canViewMapData(id, user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await AppRuntime.runPromise(
    ReplayService.pipe(Effect.flatMap((svc) => svc.getReplayData(id)))
  );

  if (data.type !== "ready") {
    return NextResponse.json({ error: data.type }, { status: 422 });
  }

  // Slim payload: the ghost reuses the PRIMARY's calibration (same map),
  // so we strip calibration/presigned URLs entirely.
  return NextResponse.json({
    positionSamples: data.positionSamples,
    displayEvents: data.displayEvents,
    roundStarts: data.calibration.roundStarts,
    team1Name: data.team1Name,
    team2Name: data.team2Name,
  });
}

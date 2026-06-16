import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { dataLabeling } from "@/lib/flags";
import { Logger } from "@/lib/logger";
import { classifyZonesForCalibration } from "@/lib/zones/classify";
import { forbidden, unauthorized } from "next/navigation";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, props: Params) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "POST",
    path: "/api/admin/map-calibration/[id]/zones/generate",
    timestamp: new Date().toISOString(),
  };

  try {
    const { id } = await props.params;
    const user = await getCurrentUser();
    if (!user) unauthorized();
    if (!isAdminUser(user)) forbidden();

    const enabled = await dataLabeling();
    if (!enabled) forbidden();

    const numericId = parseInt(id, 10);
    wideEvent.user = { id: user.id, email: user.email };
    wideEvent.calibration_id = numericId;

    const result = await classifyZonesForCalibration(numericId, user.id);
    if (!result.ok) {
      wideEvent.status_code = 422;
      wideEvent.outcome = "classify_failed";
      wideEvent.reason = result.reason;
      return NextResponse.json({ error: result.reason }, { status: 422 });
    }

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";
    wideEvent.point_zones = result.pointZones;
    wideEvent.lane_zones = result.laneZones;

    return NextResponse.json(result);
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

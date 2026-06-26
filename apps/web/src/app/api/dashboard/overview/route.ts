import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import {
  canViewTeamOverview,
  getAllOverview,
  getTeamOverview,
  type DashboardOverview,
} from "@/lib/dashboard/overview";
import { Logger } from "@/lib/logger";
import { Effect } from "effect";
import { unauthorized } from "next/navigation";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function parseOptionalPositiveInt(value: string | null): number | undefined {
  if (value === null || !/^[1-9]\d*$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) unauthorized();

  const userData = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!userData) unauthorized();

  const searchParams = req.nextUrl.searchParams;
  const teamId = parseOptionalPositiveInt(searchParams.get("teamId"));
  const adminMode = searchParams.get("adminMode") === "true";

  try {
    let payload: DashboardOverview;

    if (teamId && !adminMode) {
      const allowed = await canViewTeamOverview(
        userData.id,
        userData.role,
        teamId
      );
      payload = allowed
        ? await getTeamOverview(teamId)
        : await getAllOverview({
            userId: userData.id,
            role: userData.role,
            adminMode: false,
          });
    } else {
      payload = await getAllOverview({
        userId: userData.id,
        role: userData.role,
        adminMode,
      });
    }

    return NextResponse.json(payload);
  } catch (error) {
    Logger.error("Error building dashboard overview:", error);
    return NextResponse.json(
      { error: "Failed to load overview" },
      { status: 500 }
    );
  }
}

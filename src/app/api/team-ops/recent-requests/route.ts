import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth, canManageTeam } from "@/lib/auth";
import { getRecentLinkableRequests } from "@/lib/team-ops/scrim-feedback";
import { unauthorized } from "next/navigation";
import type { NextRequest } from "next/server";

export type RecentRequestsResponse = {
  requests: { scrimRequestId: string; opponentTeamId: number; opponentTeamName: string }[];
};

export async function GET(request: NextRequest) {
  const teamId = Number(new URL(request.url).searchParams.get("teamId"));
  if (!Number.isInteger(teamId) || teamId <= 0) {
    return Response.json({ requests: [] } satisfies RecentRequestsResponse);
  }
  const session = await auth();
  if (!session) unauthorized();
  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!user || !(await canManageTeam(teamId, user))) {
    return Response.json({ requests: [] } satisfies RecentRequestsResponse);
  }
  return Response.json({ requests: await getRecentLinkableRequests(teamId) } satisfies RecentRequestsResponse);
}

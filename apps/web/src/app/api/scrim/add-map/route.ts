import { auditLog } from "@/lib/audit-logs";
import { auth, canEditScrim, getCurrentUser } from "@/lib/auth";
import { mapAddedCounter, scrimParsingDuration } from "@/lib/axiom/metrics";
import { Logger } from "@/lib/logger";
import { createNewMap } from "@/lib/parser";
import prisma from "@/lib/prisma";
import { normalizeMapForScrim } from "@/lib/team-normalization";
import { resolveSetWinnerOutcome } from "@/lib/scrim/set-winner-validation";
import { UsageEventName } from "@/lib/usage/names";
import { usage } from "@/lib/usage/server";
import type { ParserData } from "@/types/parser";
import type { UploadWinnerSource } from "@/lib/winner-source";
import { track } from "@vercel/analytics/server";
import { after, type NextRequest } from "next/server";

export type AddMapRequestData = {
  map: ParserData;
  order?: number;
  heroBans?: {
    hero: string;
    team: string;
    banPosition: number;
  }[];
  winner?: string | null;
  winnerSource?: UploadWinnerSource | null;
};

// Large logs insert tens of thousands of event rows; give the function the
// plan's maximum runtime so a big upload is never killed mid-insert.
export const maxDuration = 800;

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const event: Record<string, unknown> = {
    route: "POST /api/scrim/add-map",
    timestamp: new Date().toISOString(),
  };

  try {
    const session = await auth();

    const id = req.nextUrl.searchParams.get("id") ?? "";
    event.scrim_id_raw = id;

    const data = (await req.json()) as AddMapRequestData;
    event.has_hero_bans = (data.heroBans?.length ?? 0) > 0;
    event.hero_ban_count = data.heroBans?.length ?? 0;

    if (
      data.winnerSource != null &&
      data.winnerSource !== "auto_coords" &&
      data.winnerSource !== "manual"
    ) {
      event.outcome = "invalid_winner_source";
      event.status_code = 400;
      return new Response("Invalid winner source", { status: 400 });
    }

    if (!session?.user?.email) {
      event.outcome = "unauthorized";
      event.status_code = 401;
      return new Response("Unauthorized", { status: 401 });
    }

    event.user_email = session.user.email;

    const scrimId = parseInt(id);
    if (!Number.isInteger(scrimId)) {
      event.outcome = "invalid_scrim_id";
      event.status_code = 400;
      return new Response("Invalid scrim ID", { status: 400 });
    }
    event.scrim_id = scrimId;
    let mapData = data.map;

    const user = await getCurrentUser();
    if (!(await canEditScrim(scrimId, user))) {
      event.outcome = "forbidden";
      event.status_code = 403;
      return new Response("Forbidden", { status: 403 });
    }

    const scrim = await prisma.scrim.findUnique({
      where: { id: scrimId },
      select: {
        autoAssignTeamNames: true,
        team1Name: true,
        team2Name: true,
        teamId: true,
      },
    });

    event.team_id = scrim?.teamId;
    event.auto_assign_team_names = scrim?.autoAssignTeamNames ?? false;

    // Validate the chosen winner against the RAW uploaded team names before any
    // normalization renames them.
    if (data.winner) {
      const winnerOutcome = resolveSetWinnerOutcome(data.winner, {
        team1: String(data.map.match_start[0][4]),
        team2: String(data.map.match_start[0][5]),
      });
      if (!winnerOutcome.ok) {
        event.outcome = "invalid_winner";
        event.status_code = 400;
        return new Response(winnerOutcome.error, { status: 400 });
      }
    }

    let mapWinner = data.winner ?? null;
    if (scrim?.autoAssignTeamNames && scrim.teamId && scrim.team1Name) {
      event.normalized_teams = true;
      const result = await normalizeMapForScrim(
        mapData,
        scrim.teamId,
        scrim.team1Name,
        scrim.team2Name,
        data.winner ?? null
      );
      mapData = result.map;
      mapWinner = result.winner;
    }

    const parseStart = performance.now();
    await createNewMap(
      {
        map: mapData,
        scrimId,
        order: data.order,
        heroBans: data.heroBans,
        winner: mapWinner,
        winnerSource: data.winnerSource ?? null,
      },
      session
    );
    const parseDuration = performance.now() - parseStart;
    scrimParsingDuration.record(parseDuration);
    mapAddedCounter.add(1);
    void usage.track({
      name: UsageEventName.SCRIM_MAP_ADD,
      userId: user?.id,
      teamId: scrim?.teamId,
    });

    event.parse_duration_ms = Math.round(parseDuration);
    event.outcome = "success";
    event.status_code = 200;

    after(async () => {
      await Promise.all([
        track("Create Map", { user: session.user.email }),
        auditLog.createAuditLog({
          userEmail: session.user.email,
          action: "MAP_CREATED",
          target: id,
          details: `Map created: ${id}`,
        }),
      ]);
    });

    return new Response("OK", { status: 200 });
  } catch (e: unknown) {
    event.outcome = "error";
    event.status_code = 500;
    event.error = {
      message: e instanceof Error ? e.message : String(e),
      type: e instanceof Error ? e.name : "UnknownError",
    };

    if (e instanceof Error) return new Response(e.message, { status: 500 });

    return new Response("Internal Server Error", { status: 500 });
  } finally {
    event.duration_ms = Date.now() - startTime;
    Logger.info(event);
  }
}

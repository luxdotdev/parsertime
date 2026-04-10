import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { dataLabeling } from "@/lib/flags";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "GET",
    path: "/api/data-labeling/matches",
    timestamp: new Date().toISOString(),
  };

  try {
    const enabled = await dataLabeling();
    if (!enabled) {
      wideEvent.status_code = 404;
      wideEvent.outcome = "feature_disabled";
      return new Response("Not found", { status: 404 });
    }

    const session = await auth();
    if (!session?.user?.email) {
      wideEvent.status_code = 401;
      wideEvent.outcome = "unauthorized";
      wideEvent.error = { message: "No session found" };
      return new Response("Unauthorized", { status: 401 });
    }

    const user = await AppRuntime.runPromise(
      UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
    );
    if (!user) {
      wideEvent.status_code = 404;
      wideEvent.outcome = "user_not_found";
      wideEvent.error = { message: "User not found" };
      return new Response("User not found", { status: 404 });
    }

    wideEvent.user = { id: user.id, email: user.email };

    const page = Math.max(
      0,
      Number(request.nextUrl.searchParams.get("page") ?? "0")
    );
    const pageSize = Math.min(
      50,
      Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") ?? "20"))
    );

    wideEvent.request_params = { page, page_size: pageSize };

    const where = {
      NOT: {
        vods: { equals: "[]" as unknown as undefined },
      },
      maps: {
        some: {
          OR: [
            { team1Comp: { isEmpty: true } },
            { team2Comp: { isEmpty: true } },
          ],
        },
      },
    };

    const [matches, totalCount] = await Promise.all([
      prisma.scoutingMatch.findMany({
        where,
        include: {
          maps: { select: { id: true, team1Comp: true, team2Comp: true } },
          tournament: { select: { title: true } },
        },
        orderBy: { matchDate: "desc" },
        skip: page * pageSize,
        take: pageSize,
      }),
      prisma.scoutingMatch.count({ where }),
    ]);

    const result = {
      matches: matches.map((m) => {
        const vods = m.vods as { url: string; platform: string }[];
        const labeledMaps = m.maps.filter(
          (map) => map.team1Comp.length > 0 && map.team2Comp.length > 0
        ).length;

        return {
          id: m.id,
          team1: m.team1,
          team1FullName: m.team1FullName,
          team2: m.team2,
          team2FullName: m.team2FullName,
          team1Score: m.team1Score,
          team2Score: m.team2Score,
          matchDate: m.matchDate,
          tournament: m.tournament.title,
          vodCount: vods.length,
          labeledMaps,
          totalMaps: m.maps.length,
        };
      }),
      totalCount,
      page,
      pageSize,
    };

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";
    wideEvent.result = {
      match_count: result.matches.length,
      total_count: totalCount,
      page,
    };

    return NextResponse.json(result);
  } catch (error) {
    wideEvent.status_code = 500;
    wideEvent.outcome = "error";
    wideEvent.error = {
      message: error instanceof Error ? error.message : "Unknown error",
      type: error instanceof Error ? error.name : "Error",
    };
    Logger.error("Error fetching unlabeled matches", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch matches" },
      { status: 500 }
    );
  } finally {
    wideEvent.duration_ms = Date.now() - startTime;
    Logger.info(wideEvent);
  }
}

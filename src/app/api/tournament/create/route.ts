import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import {
  generateDoubleEliminationBracket,
  generateRoundRobinSEBracket,
  generateSingleEliminationBracket,
  getByeWinner,
  getNextMatch,
} from "@/lib/tournaments/bracket";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { TournamentFormat } from "@prisma/client";
import { Ratelimit } from "@upstash/ratelimit";
import { ipAddress } from "@vercel/functions";
import { kv } from "@vercel/kv";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";
import { z } from "zod";

const bestOfSchema = z
  .number()
  .int()
  .min(1)
  .max(9)
  .refine((n) => n % 2 === 1, {
    message: "Best-of must be an odd number",
  });

const createTournamentSchema = z.object({
  name: z.string().min(2).max(50),
  format: z.nativeEnum(TournamentFormat),
  bestOf: bestOfSchema,
  playoffBestOf: bestOfSchema.optional(),
  advancingTeams: z.number().int().min(2).optional(),
  teams: z
    .array(
      z.object({
        name: z.string().min(1).max(50),
        teamId: z.number().int().optional(),
        seed: z.number().int().min(1),
      })
    )
    .min(2)
    .max(64),
});

export type CreateTournamentRequestData = z.infer<
  typeof createTournamentSchema
>;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const event: Record<string, unknown> = {
    route: "tournament.create",
    method: "POST",
  };

  try {
    const session = await auth();
    if (!session) {
      event.outcome = "unauthorized";
      unauthorized();
    }
    event.userEmail = session.user.email;

    const ratelimit = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      analytics: true,
    });

    const identifier = ipAddress(request) ?? "127.0.0.1";
    const { success } = await ratelimit.limit(identifier);

    if (!success) {
      event.outcome = "rate_limited";
      event.statusCode = 429;
      event.ip = identifier;
      return new Response("Rate limit exceeded", { status: 429 });
    }

    const body = await request.json();
    const parsed = createTournamentSchema.safeParse(body);

    if (!parsed.success) {
      event.outcome = "validation_error";
      event.statusCode = 400;
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, format, bestOf, playoffBestOf, teams } = parsed.data;
    event.format = format;
    event.teamCount = teams.length;
    event.bestOf = bestOf;
    event.playoffBestOf = playoffBestOf ?? null;
    event.advancingTeams = parsed.data.advancingTeams ?? null;

    const supportedFormats = [
      TournamentFormat.SINGLE_ELIMINATION,
      TournamentFormat.DOUBLE_ELIMINATION,
      TournamentFormat.ROUND_ROBIN_SE,
    ];
    if (!supportedFormats.includes(format)) {
      event.outcome = "unsupported_format";
      event.statusCode = 400;
      return Response.json(
        { error: "Unsupported tournament format" },
        { status: 400 }
      );
    }

    const user = await AppRuntime.runPromise(
      UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
    );
    if (!user) {
      event.outcome = "user_not_found";
      event.statusCode = 404;
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const bracket =
      format === TournamentFormat.DOUBLE_ELIMINATION
        ? generateDoubleEliminationBracket(teams.length)
        : format === TournamentFormat.ROUND_ROBIN_SE
          ? generateRoundRobinSEBracket(
              teams.length,
              parsed.data.advancingTeams
            )
          : generateSingleEliminationBracket(teams.length);

    const tournament = await prisma.$transaction(async (tx) => {
      const t = await tx.tournament.create({
        data: {
          name,
          format,
          bestOf,
          playoffBestOf: playoffBestOf ?? null,
          advancingTeams: parsed.data.advancingTeams ?? null,
          teamSlots: teams.length,
          creatorId: user.id,
        },
      });

      const tournamentTeams = await Promise.all(
        teams.map((team) =>
          tx.tournamentTeam.create({
            data: {
              tournamentId: t.id,
              teamId: team.teamId ?? null,
              name: team.name,
              seed: team.seed,
            },
          })
        )
      );

      const seedToTeamId = new Map<number, number>();
      for (const tt of tournamentTeams) {
        seedToTeamId.set(tt.seed, tt.id);
      }

      const rounds = await Promise.all(
        bracket.rounds.map((round) => {
          let roundBestOf: number | null = null;
          if (playoffBestOf && round.bracket === "WINNERS") {
            roundBestOf = playoffBestOf;
          } else if (playoffBestOf && round.bracket === "ROUND_ROBIN") {
            roundBestOf = bestOf;
          }

          return tx.tournamentRound.create({
            data: {
              tournamentId: t.id,
              roundNumber: round.roundNumber,
              roundName: round.roundName,
              bracket: round.bracket,
              bestOf: roundBestOf,
            },
          });
        })
      );

      function roundKey(bracket: string, roundNumber: number) {
        return `${bracket}-${roundNumber}`;
      }
      const roundLookup = new Map<string, number>();
      for (const r of rounds) {
        roundLookup.set(roundKey(r.bracket, r.roundNumber), r.id);
      }

      const wbRoundCount = bracket.rounds.filter(
        (r) => r.bracket === "WINNERS"
      ).length;

      for (const matchSpec of bracket.matches) {
        const roundId = roundLookup.get(
          roundKey(matchSpec.bracket, matchSpec.roundNumber)
        )!;

        const team1Id = matchSpec.team1Seed
          ? (seedToTeamId.get(matchSpec.team1Seed) ?? null)
          : null;
        const team2Id = matchSpec.team2Seed
          ? (seedToTeamId.get(matchSpec.team2Seed) ?? null)
          : null;

        const roundSpec = bracket.rounds.find(
          (r) =>
            r.roundNumber === matchSpec.roundNumber &&
            r.bracket === matchSpec.bracket
        );
        const scrim = await tx.scrim.create({
          data: {
            name: `[Tournament] ${name} - ${roundSpec?.roundName} Match ${matchSpec.bracketPosition + 1}`,
            date: new Date(),
            creatorId: user.id,
            autoAssignTeamNames: false,
          },
        });

        await tx.tournamentMatch.create({
          data: {
            tournamentId: t.id,
            roundId,
            bracketPosition: matchSpec.bracketPosition,
            team1Id,
            team2Id,
            scrimId: scrim.id,
          },
        });
      }

      if (format !== TournamentFormat.ROUND_ROBIN_SE) {
        const firstRoundMatches = bracket.matches.filter(
          (m) => m.roundNumber === 1 && m.bracket === "WINNERS"
        );

        for (const matchSpec of firstRoundMatches) {
          const byeWinnerSeed = getByeWinner(matchSpec);
          if (byeWinnerSeed === null) continue;

          const byeWinnerId = seedToTeamId.get(byeWinnerSeed);
          if (!byeWinnerId) continue;

          const match = await tx.tournamentMatch.findFirst({
            where: {
              tournamentId: t.id,
              roundId: roundLookup.get(roundKey("WINNERS", 1))!,
              bracketPosition: matchSpec.bracketPosition,
            },
          });

          if (!match) continue;

          await tx.tournamentMatch.update({
            where: { id: match.id },
            data: {
              winnerId: byeWinnerId,
              status: "COMPLETED",
            },
          });

          const next = getNextMatch(1, matchSpec.bracketPosition, wbRoundCount);
          if (next) {
            const nextMatch = await tx.tournamentMatch.findFirst({
              where: {
                tournamentId: t.id,
                roundId: roundLookup.get(
                  roundKey("WINNERS", next.roundNumber)
                )!,
                bracketPosition: next.bracketPosition,
              },
            });

            if (nextMatch) {
              await tx.tournamentMatch.update({
                where: { id: nextMatch.id },
                data: {
                  [next.slot === "team1" ? "team1Id" : "team2Id"]: byeWinnerId,
                },
              });
            }
          }
        }
      }

      return t;
    });

    event.tournamentId = tournament.id;

    after(async () => {
      await auditLog.createAuditLog({
        userEmail: session.user.email,
        action: "TOURNAMENT_CREATED",
        target: tournament.id.toString(),
        details: `Created tournament "${name}" (${format}, ${teams.length} teams, Bo${bestOf}${playoffBestOf ? ` / Playoff Bo${playoffBestOf}` : ""})`,
      });
    });

    event.outcome = "success";
    event.statusCode = 201;
    return Response.json({ id: tournament.id }, { status: 201 });
  } catch (error) {
    event.outcome = "error";
    event.statusCode = 500;
    event.error = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: "Failed to create tournament" },
      { status: 500 }
    );
  } finally {
    event.durationMs = Date.now() - startTime;
    if (event.outcome === "error") {
      Logger.error(event);
    } else {
      Logger.info(event);
    }
  }
}

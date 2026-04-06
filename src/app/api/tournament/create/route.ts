import { getUser } from "@/data/user-dto";
import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import {
  generateSingleEliminationBracket,
  getByeWinner,
  getNextMatch,
} from "@/lib/bracket";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { TournamentFormat } from "@prisma/client";
import { Ratelimit } from "@upstash/ratelimit";
import { ipAddress } from "@vercel/functions";
import { kv } from "@vercel/kv";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";
import { z } from "zod";

const createTournamentSchema = z.object({
  name: z.string().min(2).max(50),
  format: z.nativeEnum(TournamentFormat),
  bestOf: z
    .number()
    .int()
    .min(1)
    .max(9)
    .refine((n) => n % 2 === 1, {
      message: "Best-of must be an odd number",
    }),
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
  const session = await auth();
  if (!session) {
    Logger.warn("Unauthorized request to create tournament");
    unauthorized();
  }

  const ratelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
  });

  const identifier = ipAddress(request) ?? "127.0.0.1";
  const { success } = await ratelimit.limit(identifier);

  if (!success) {
    Logger.warn(`Rate limit exceeded for tournament creation: ${identifier}`);
    return new Response("Rate limit exceeded", { status: 429 });
  }

  const body = await request.json();
  const parsed = createTournamentSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, format, bestOf, teams } = parsed.data;

  if (format !== TournamentFormat.SINGLE_ELIMINATION) {
    return Response.json(
      { error: "Only single elimination is currently supported" },
      { status: 400 }
    );
  }

  const user = await getUser(session.user.email);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const bracket = generateSingleEliminationBracket(teams.length);

    const tournament = await prisma.$transaction(async (tx) => {
      // Create tournament
      const t = await tx.tournament.create({
        data: {
          name,
          format,
          bestOf,
          teamSlots: teams.length,
          creatorId: user.id,
        },
      });

      // Create tournament teams
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

      // Build seed → tournamentTeamId lookup
      const seedToTeamId = new Map<number, number>();
      for (const tt of tournamentTeams) {
        seedToTeamId.set(tt.seed, tt.id);
      }

      // Create rounds
      const rounds = await Promise.all(
        bracket.rounds.map((round) =>
          tx.tournamentRound.create({
            data: {
              tournamentId: t.id,
              roundNumber: round.roundNumber,
              roundName: round.roundName,
            },
          })
        )
      );

      // Build roundNumber → roundId lookup
      const roundNumberToId = new Map<number, number>();
      for (const r of rounds) {
        roundNumberToId.set(r.roundNumber, r.id);
      }

      // Create a synthetic scrim for each match (needed for map data pipeline)
      // and create tournament matches
      const totalRounds = bracket.rounds.length;

      for (const matchSpec of bracket.matches) {
        const roundId = roundNumberToId.get(matchSpec.roundNumber)!;

        const team1Id = matchSpec.team1Seed
          ? (seedToTeamId.get(matchSpec.team1Seed) ?? null)
          : null;
        const team2Id = matchSpec.team2Seed
          ? (seedToTeamId.get(matchSpec.team2Seed) ?? null)
          : null;

        // Create synthetic scrim for map data pipeline
        const scrim = await tx.scrim.create({
          data: {
            name: `[Tournament] ${name} - ${bracket.rounds.find((r) => r.roundNumber === matchSpec.roundNumber)?.roundName} Match ${matchSpec.bracketPosition + 1}`,
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

      // Handle bye matches: auto-advance teams with byes
      const firstRoundMatches = bracket.matches.filter(
        (m) => m.roundNumber === 1
      );

      for (const matchSpec of firstRoundMatches) {
        const byeWinnerSeed = getByeWinner(matchSpec);
        if (byeWinnerSeed === null) continue;

        const byeWinnerId = seedToTeamId.get(byeWinnerSeed);
        if (!byeWinnerId) continue;

        // Find the match we just created
        const match = await tx.tournamentMatch.findFirst({
          where: {
            tournamentId: t.id,
            roundId: roundNumberToId.get(1)!,
            bracketPosition: matchSpec.bracketPosition,
          },
        });

        if (!match) continue;

        // Mark as completed with bye winner
        await tx.tournamentMatch.update({
          where: { id: match.id },
          data: {
            winnerId: byeWinnerId,
            status: "COMPLETED",
          },
        });

        // Advance to next round
        const next = getNextMatch(1, matchSpec.bracketPosition, totalRounds);
        if (next) {
          const nextMatch = await tx.tournamentMatch.findFirst({
            where: {
              tournamentId: t.id,
              roundId: roundNumberToId.get(next.roundNumber)!,
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

      return t;
    });

    after(async () => {
      await auditLog.createAuditLog({
        userEmail: session.user.email,
        action: "TOURNAMENT_CREATED",
        target: tournament.id.toString(),
        details: `Created tournament "${name}" (${format}, ${teams.length} teams, Bo${bestOf})`,
      });
    });

    return Response.json({ id: tournament.id }, { status: 201 });
  } catch (error) {
    Logger.error("Failed to create tournament", error);
    return Response.json(
      { error: "Failed to create tournament" },
      { status: 500 }
    );
  }
}

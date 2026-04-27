import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { computeTeamTsr } from "@/lib/tsr/team";
import { renderScrimRequestMessage } from "@/lib/matchmaker/messages";
import { getTierBucket } from "@/lib/tsr/tier-bucket";
import {
  computeAvailabilityOverlapHours,
  loadCurrentTeamAvailability,
} from "@/lib/matchmaker/availability";
import { SkillDeviation } from "@/components/matchmaker/skill-deviation";
import { SendRequestButton } from "@/components/matchmaker/send-request-button";
import { TeamTsrCard } from "@/components/team/team-tsr-card";
import { UserRole } from "@prisma/client";

type PageProps = {
  params: Promise<{ teamId: string; opposingTeamId: string }>;
};

const COOLDOWN_HOURS = 24;
const DAILY_LIMIT = 10;

export default async function MatchmakerDetailPage({ params }: PageProps) {
  const { teamId: rawFromId, opposingTeamId: rawToId } = await params;
  const fromTeamId = parseInt(rawFromId, 10);
  const toTeamId = parseInt(rawToId, 10);
  if (Number.isNaN(fromTeamId) || Number.isNaN(toTeamId)) {
    redirect(`/matchmaker/${rawFromId}` as Route);
  }

  const session = await auth();
  if (!session?.user?.email) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      role: true,
      teams: { where: { id: fromTeamId }, select: { id: true } },
    },
  });
  if (!user) redirect("/team");
  const isAdmin = user.role === UserRole.ADMIN;
  if (user.teams.length === 0 && !isAdmin) redirect("/team");

  const [fromSnap, toSnap, fromTeam, toTeam] = await Promise.all([
    prisma.teamTsrSnapshot.findUnique({ where: { teamId: fromTeamId } }),
    prisma.teamTsrSnapshot.findUnique({ where: { teamId: toTeamId } }),
    prisma.team.findUnique({
      where: { id: fromTeamId },
      select: {
        name: true,
        ownerId: true,
        managers: { select: { userId: true } },
        users: { select: { id: true, name: true, battletag: true } },
        scrims: { select: { id: true } },
      },
    }),
    prisma.team.findUnique({
      where: { id: toTeamId },
      select: {
        name: true,
        users: { select: { id: true, name: true, battletag: true } },
        scrims: { select: { id: true } },
      },
    }),
  ]);

  if (!fromSnap || !toSnap || !fromTeam || !toTeam) {
    redirect(`/matchmaker/${fromTeamId}` as Route);
  }

  const isManager =
    isAdmin ||
    fromTeam.ownerId === user.id ||
    fromTeam.managers.some((m) => m.userId === user.id);

  const since = new Date(Date.now() - COOLDOWN_HOURS * 3_600_000);
  const [recentToTarget, sentToday] = await Promise.all([
    prisma.scrimRequest.findFirst({
      where: {
        fromTeamId,
        toTeamId,
        createdAt: { gt: since },
      },
    }),
    prisma.scrimRequest.count({
      where: { fromTeamId, createdAt: { gt: since } },
    }),
  ]);

  const [fromTsrDetail, toTsrDetail, searcherAvail, opponentAvail] =
    await Promise.all([
      computeTeamTsr(
        fromTeam.users.map((u) => ({
          id: u.id,
          name: u.name,
          battletag: u.battletag,
        })),
        fromTeam.scrims.map((s) => s.id),
      ),
      computeTeamTsr(
        toTeam.users.map((u) => ({
          id: u.id,
          name: u.name,
          battletag: u.battletag,
        })),
        toTeam.scrims.map((s) => s.id),
      ),
      loadCurrentTeamAvailability(fromTeamId),
      loadCurrentTeamAvailability(toTeamId),
    ]);

  const overlapHours = computeAvailabilityOverlapHours({
    a: searcherAvail,
    b: opponentAvail,
  });

  const fromBucket = getTierBucket(fromSnap.rating);
  const cannedMessage = renderScrimRequestMessage({
    fromTeamName: fromTeam.name,
    fromBracketLabel: fromBucket.label,
    fromTsr: fromSnap.rating,
    toTsr: toSnap.rating,
  });

  let disabledReason: string | null = null;
  if (!isManager) disabledReason = "Only managers can send scrim requests";
  else if (recentToTarget) disabledReason = "Already messaged in last 24h";
  else if (sentToday >= DAILY_LIMIT)
    disabledReason = "Daily limit reached, resets in 24h";

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            Matchmaker · Scrim
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {fromTeam.name} vs {toTeam.name}
          </h1>
        </div>
        <Link
          href={`/matchmaker/${fromTeamId}` as Route}
          className="text-muted-foreground hover:text-foreground font-mono text-[11px] tracking-[0.16em] uppercase"
        >
          ← Back to candidates
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
            Your team
          </p>
          <TeamTsrCard result={fromTsrDetail} teamId={fromTeamId} />
        </div>
        <div className="space-y-2">
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
            Their team
          </p>
          <TeamTsrCard result={toTsrDetail} teamId={toTeamId} />
        </div>
      </div>

      <SkillDeviation
        fromRating={fromSnap.rating}
        toRating={toSnap.rating}
      />

      {overlapHours > 0 && (
        <div className="border-border bg-card rounded-xl border p-6">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            Availability overlap
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            Both teams have{" "}
            <span className="font-mono font-semibold tabular-nums">
              {overlapHours}
            </span>{" "}
            shared{" "}
            {overlapHours === 1 ? "hour" : "hours"} this week.
          </p>
        </div>
      )}

      <section className="border-border bg-card space-y-5 rounded-xl border p-6">
        <div>
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            Message preview
          </p>
          <p className="text-foreground mt-2 text-sm leading-relaxed">
            {cannedMessage}
          </p>
        </div>
        <SendRequestButton
          fromTeamId={fromTeamId}
          toTeamId={toTeamId}
          disabledReason={disabledReason}
        />
      </section>
    </div>
  );
}

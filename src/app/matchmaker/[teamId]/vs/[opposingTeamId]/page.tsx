import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { computeTeamTsr } from "@/lib/tsr/team";
import { getTierBucket } from "@/lib/tsr/tier-bucket";
import {
  computeAvailabilityOverlapHours,
  loadCurrentTeamAvailability,
} from "@/lib/matchmaker/availability";
import { getMatchmakerCandidates } from "@/lib/matchmaker/candidates";
import { SkillDeviation } from "@/components/matchmaker/skill-deviation";
import { SendRequestButton } from "@/components/matchmaker/send-request-button";
import { TeamTsrCard } from "@/components/team/team-tsr-card";
import { FaceitTier, UserRole } from "@prisma/client";
import { getFormatter, getTranslations } from "next-intl/server";

type PageProps = {
  params: Promise<{ teamId: string; opposingTeamId: string }>;
};

const COOLDOWN_HOURS = 24;
const DAILY_LIMIT = 10;

export default async function MatchmakerDetailPage({ params }: PageProps) {
  const [t, formatter] = await Promise.all([
    getTranslations("matchmaker"),
    getFormatter(),
  ]);
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

  const since = new Date(Date.now() - COOLDOWN_HOURS * 3_600_000);
  const [candidateResult, recentInboundRequest] = await Promise.all([
    getMatchmakerCandidates(fromTeamId),
    prisma.scrimRequest.findFirst({
      where: {
        fromTeamId: toTeamId,
        toTeamId: fromTeamId,
        createdAt: { gt: since },
      },
      select: { id: true },
    }),
  ]);
  if (candidateResult.kind !== "ok") {
    redirect(`/matchmaker/${fromTeamId}` as Route);
  }
  const targetIsEligible = candidateResult.candidates.some(
    (candidate) => candidate.teamId === toTeamId
  );
  if (!targetIsEligible && !recentInboundRequest) {
    redirect(`/matchmaker/${fromTeamId}` as Route);
  }

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
        fromTeam.scrims.map((s) => s.id)
      ),
      computeTeamTsr(
        toTeam.users.map((u) => ({
          id: u.id,
          name: u.name,
          battletag: u.battletag,
        })),
        toTeam.scrims.map((s) => s.id)
      ),
      loadCurrentTeamAvailability(fromTeamId),
      loadCurrentTeamAvailability(toTeamId),
    ]);

  const overlapHours = computeAvailabilityOverlapHours({
    a: searcherAvail,
    b: opponentAvail,
  });

  const fromBucket = getTierBucket(fromSnap.rating);
  const cannedMessage = t("request-message", {
    fromTeamName: fromTeam.name,
    fromBracketLabel: getBracketLabel(fromBucket.band, fromBucket.tier, t),
    fromTsr: fromSnap.rating,
    delta: formatSignedDelta(fromSnap.rating - toSnap.rating, formatter, t),
  });

  let disabledReason: string | null = null;
  if (!isManager) disabledReason = t("send-button-not-manager");
  else if (recentToTarget) disabledReason = t("send-button-recent");
  else if (sentToday >= DAILY_LIMIT)
    disabledReason = t("send-button-limit-short");

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            {t("detail-eyebrow")}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {fromTeam.name} vs {toTeam.name}
          </h1>
        </div>
        <Link
          href={`/matchmaker/${fromTeamId}` as Route}
          className="text-muted-foreground hover:text-foreground font-mono text-[11px] tracking-[0.16em] uppercase"
        >
          {t("back-to-candidates")}
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
            {t("your-team")}
          </p>
          <TeamTsrCard result={fromTsrDetail} teamId={fromTeamId} />
        </div>
        <div className="space-y-2">
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
            {t("their-team")}
          </p>
          <TeamTsrCard result={toTsrDetail} teamId={toTeamId} />
        </div>
      </div>

      <SkillDeviation fromRating={fromSnap.rating} toRating={toSnap.rating} />

      {overlapHours > 0 && (
        <div className="border-border bg-card rounded-xl border p-6">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            {t("availability-overlap-title")}
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            {t.rich("availability-overlap-detail", {
              hours: overlapHours,
              value: (chunks) => (
                <span className="font-mono font-semibold tabular-nums">
                  {chunks}
                </span>
              ),
            })}
          </p>
        </div>
      )}

      <section className="border-border bg-card space-y-5 rounded-xl border p-6">
        <div>
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            {t("message-preview")}
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

function formatSignedDelta(
  delta: number,
  formatter: Awaited<ReturnType<typeof getFormatter>>,
  t: Awaited<ReturnType<typeof getTranslations>>
) {
  const value = formatter.number(Math.abs(delta));
  if (delta > 0) return t("delta-positive", { value });
  if (delta < 0) return t("delta-negative", { value });
  return t("delta-zero");
}

function getBracketLabel(
  band: string | null,
  tier: FaceitTier,
  t: Awaited<ReturnType<typeof getTranslations>>
) {
  const tierLabel = getTierLabel(tier, t);
  if (!band) return tierLabel;
  return t("bracket-with-band", {
    band: getBandLabel(band, t),
    tier: tierLabel,
  });
}

function getTierLabel(
  tier: FaceitTier,
  t: Awaited<ReturnType<typeof getTranslations>>
) {
  switch (tier) {
    case FaceitTier.UNCLASSIFIED:
      return t("tiers.unclassified");
    case FaceitTier.OPEN:
      return t("tiers.open");
    case FaceitTier.CAH:
      return t("tiers.cah");
    case FaceitTier.ADVANCED:
      return t("tiers.advanced");
    case FaceitTier.EXPERT:
      return t("tiers.expert");
    case FaceitTier.MASTERS:
      return t("tiers.masters");
    case FaceitTier.OWCS:
      return t("tiers.owcs");
  }
}

function getBandLabel(
  band: string,
  t: Awaited<ReturnType<typeof getTranslations>>
) {
  switch (band) {
    case "Low":
      return t("bands.low");
    case "Mid":
      return t("bands.mid");
    case "High":
      return t("bands.high");
    default:
      return band;
  }
}

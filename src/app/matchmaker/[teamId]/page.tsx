import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getMatchmakerCandidates } from "@/lib/matchmaker/candidates";
import { SearcherSummary } from "@/components/matchmaker/searcher-summary";
import { CandidateRow } from "@/components/matchmaker/candidate-row";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { UserRole } from "@prisma/client";

type PageProps = { params: Promise<{ teamId: string }> };

export default async function MatchmakerListPage({ params }: PageProps) {
  const { teamId: rawTeamId } = await params;
  const teamId = parseInt(rawTeamId, 10);
  if (Number.isNaN(teamId)) redirect("/matchmaker");

  const session = await auth();
  if (!session?.user?.email) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      role: true,
      teams: { where: { id: teamId }, select: { id: true } },
    },
  });
  if (!user) redirect("/team");
  const isAdmin = user.role === UserRole.ADMIN;
  if (user.teams.length === 0 && !isAdmin) redirect("/team");

  const result = await getMatchmakerCandidates(teamId);

  if (result.kind === "no-snapshot") {
    return (
      <div className="container mx-auto max-w-3xl p-6">
        <div className="border-border bg-card rounded-xl border p-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            No Team TSR yet
          </h1>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-relaxed">
            Your team needs a Team TSR before you can search for scrim
            partners. Play in tracked tournaments or wait for the daily
            refresh.
          </p>
          <Link
            href={`/team/${teamId}` as Route}
            className="text-primary mt-5 inline-block font-mono text-[11px] tracking-[0.16em] uppercase hover:underline"
          >
            Back to team →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      <SearcherSummary summary={result.searcher} />
      {result.candidates.length === 0 ? (
        <div className="border-border bg-card rounded-xl border p-8 text-center">
          <h2 className="text-lg font-medium tracking-tight">
            No nearby teams right now
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Try again later — the candidate pool refreshes daily.
          </p>
        </div>
      ) : (
        <div className="border-border divide-border bg-card divide-y overflow-hidden rounded-xl border">
          {result.candidates.map((c) => (
            <CandidateRow
              key={c.teamId}
              searcherTeamId={teamId}
              candidate={c}
            />
          ))}
        </div>
      )}
    </div>
  );
}

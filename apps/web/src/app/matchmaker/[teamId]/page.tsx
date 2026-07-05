import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getMatchmakerCandidates } from "@/lib/matchmaker/candidates";
import { SearcherSummary } from "@/components/matchmaker/searcher-summary";
import { CandidateRow } from "@/components/matchmaker/candidate-row";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { UserRole } from "@/generated/prisma/browser";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

type PageProps = { params: Promise<{ teamId: string }> };

// Static shell: everything on this page is request-derived (params, auth,
// candidate search), so the shell is a single boundary whose fallback mirrors
// the candidate-list layout — one stable skeleton the content replaces in
// place.
export default function MatchmakerListPage({ params }: PageProps) {
  return (
    <Suspense fallback={<MatchmakerListSkeleton />}>
      <MatchmakerListContent params={params} />
    </Suspense>
  );
}

async function MatchmakerListContent({ params }: PageProps) {
  const t = await getTranslations("matchmaker");
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
            {t("no-snapshot-title")}
          </h1>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-relaxed">
            {t("no-snapshot-description")}
          </p>
          <Link
            href={`/team/${teamId}` as Route}
            className="text-primary mt-5 inline-block font-mono text-[11px] tracking-[0.16em] uppercase hover:underline"
          >
            {t("back-to-team")}
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
            {t("no-candidates-title")}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("no-candidates-description")}
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

// Mirrors SearcherSummary (header card with title, rating block, tier ladder)
// and a column of CandidateRows so the streamed content lands with no jump.
function MatchmakerListSkeleton() {
  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      <header className="border-border bg-card/40 rounded-xl border p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-9 w-24" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          </div>
        </div>
        <div className="mt-5">
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
      </header>

      <div className="border-border divide-border bg-card divide-y overflow-hidden rounded-xl border">
        {["a", "b", "c", "d", "e"].map((k) => (
          <div
            key={k}
            className="flex items-center justify-between gap-6 px-5 py-4"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-12" />
              </div>
              <Skeleton className="h-4 w-full max-w-xs" />
            </div>
            <div className="flex flex-col items-end gap-1">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3.5 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { deleteRankedMatch } from "@/app/ranked/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { heroImageUrl, mapImageUrl } from "@/lib/utils";
import { format, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, Trash2, Users } from "lucide-react";
import Image from "next/image";
import { useMemo, useState, useTransition } from "react";

const PAGE_SIZE = 10;

type MatchHeroData = {
  id: string;
  hero: string;
  role: string;
  percentage: number;
};

type MatchData = {
  id: string;
  map: string;
  mapType: string;
  result: string;
  groupSize: number;
  playedAt: Date;
  heroes: MatchHeroData[];
};

const GROUP_SIZE_LABELS: Record<number, string> = {
  1: "Solo",
  2: "Duo",
  3: "3-Stack",
  4: "4-Stack",
  5: "5-Stack",
};

function ResultBadge({ result }: { result: string }) {
  const styles = {
    win: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    loss: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    draw: "bg-muted text-muted-foreground",
  };

  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize ${
        styles[result as keyof typeof styles] ?? styles.draw
      }`}
    >
      {result}
    </span>
  );
}

function DeleteMatchDialog({ matchId }: { matchId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteRankedMatch(matchId);
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete match"
          disabled={isPending}
        >
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete match?</AlertDialogTitle>
          <AlertDialogDescription className="text-pretty">
            This will permanently remove this match from your history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete}>
            {isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function MatchList({ matches }: { matches: MatchData[] }) {
  const [page, setPage] = useState(1);

  const recentMatches = useMemo(() => {
    const cutoff = subDays(new Date(), 7);
    return matches.filter((m) => new Date(m.playedAt) >= cutoff);
  }, [matches]);

  const totalPages = Math.max(1, Math.ceil(recentMatches.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const pageMatches = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return recentMatches.slice(start, start + PAGE_SIZE);
  }, [recentMatches, safePage]);

  if (recentMatches.length === 0) return null;

  const start = (safePage - 1) * PAGE_SIZE + 1;
  const end = Math.min(safePage * PAGE_SIZE, recentMatches.length);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-balance">
          Recent Matches
          <span className="text-muted-foreground ml-2 text-sm font-normal">
            (last 7 days)
          </span>
        </h2>
        {totalPages > 1 && (
          <span className="text-muted-foreground text-xs">
            {start}–{end} of {recentMatches.length}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {pageMatches.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Previous
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {safePage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            aria-label="Next page"
          >
            Next
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: MatchData }) {
  return (
    <div className="border-border flex items-center gap-4 rounded-lg border p-3">
      <Image
        src={mapImageUrl(match.map)}
        alt={match.map}
        width={80}
        height={45}
        className="hidden rounded-md object-cover sm:block"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{match.map}</span>
          <ResultBadge result={match.result} />
        </div>

        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span>{format(new Date(match.playedAt), "MMM d, yyyy")}</span>
          <span className="flex items-center gap-1">
            <Users className="size-3" />
            {GROUP_SIZE_LABELS[match.groupSize] ?? `${match.groupSize}-Stack`}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {match.heroes.map((hero) => (
            <div
              key={hero.id}
              className="bg-muted/50 flex items-center gap-1 rounded-md px-1.5 py-0.5"
              title={`${hero.hero} (${hero.percentage}%)`}
            >
              <Image
                src={heroImageUrl(hero.hero)}
                alt={hero.hero}
                width={20}
                height={20}
                className="size-5 rounded-sm"
              />
              <span className="text-xs tabular-nums">{hero.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      <DeleteMatchDialog matchId={match.id} />
    </div>
  );
}

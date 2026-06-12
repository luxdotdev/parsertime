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
import { useTranslations } from "next-intl";
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

const GROUP_SIZE_LABEL_KEYS: Record<number, string> = {
  1: "groupSolo",
  2: "groupDuo",
  3: "group3Stack",
  4: "group4Stack",
  5: "group5Stack",
};

function ResultBadge({ result }: { result: string }) {
  const t = useTranslations("ranked.matchList");
  const styles = {
    win: "bg-primary/15 text-primary",
    loss: "bg-destructive/15 text-destructive",
    draw: "bg-muted text-muted-foreground",
  };

  const labelKeys = {
    win: "resultWin",
    loss: "resultLoss",
    draw: "resultDraw",
  };

  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize ${
        styles[result as keyof typeof styles] ?? styles.draw
      }`}
    >
      {t(labelKeys[result as keyof typeof labelKeys] ?? labelKeys.draw)}
    </span>
  );
}

function DeleteMatchDialog({ matchId }: { matchId: string }) {
  const t = useTranslations("ranked.matchList");
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
          aria-label={t("deleteMatchAria")}
          disabled={isPending}
        >
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription className="text-pretty">
            {t("deleteBody")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete}>
            {isPending ? t("deleting") : t("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function MatchList({ matches }: { matches: MatchData[] }) {
  const t = useTranslations("ranked.matchList");
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
      <div>
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {t("eyebrow")}
        </p>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">
            {t("recentMatches")}
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              {t("lastSevenDays")}
            </span>
          </h2>
          {totalPages > 1 && (
            <span className="text-muted-foreground text-xs">
              {t("counter", {
                start,
                end,
                total: recentMatches.length,
              })}
            </span>
          )}
        </div>
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
            aria-label={t("previousAria")}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            {t("previous")}
          </Button>
          <span className="text-muted-foreground text-sm">
            {t("pageOf", { page: safePage, total: totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            aria-label={t("nextAria")}
          >
            {t("next")}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: MatchData }) {
  const t = useTranslations("ranked.matchList");
  const groupLabelKey = GROUP_SIZE_LABEL_KEYS[match.groupSize];
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
            {groupLabelKey
              ? t(groupLabelKey)
              : t("groupNStack", { count: match.groupSize })}
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

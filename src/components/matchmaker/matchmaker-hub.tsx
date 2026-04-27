import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import type { FaceitTier, TsrRegion } from "@prisma/client";

export type HubTeam = {
  id: number;
  name: string;
  hasSnapshot: boolean;
  bracketLabel: string | null;
  region: TsrRegion | null;
  rating: number | null;
  bracketTier: FaceitTier | null;
};

type Props = {
  teams: HubTeam[];
};

export function MatchmakerHub({ teams }: Props) {
  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border border-b pb-6">
        <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
          Matchmaker
        </p>
        <h1 className="mt-3 text-4xl leading-none font-semibold tracking-tight">
          Find a scrim partner
        </h1>
        <p className="text-muted-foreground mt-3 max-w-prose text-sm leading-relaxed">
          Match your roster against teams at a comparable skill level, see
          where they sit on the bracket ladder, and send a single canned
          introduction. Built on Team TSR — same scale you see on the team
          page.
        </p>
      </header>

      <section className="grid gap-x-10 gap-y-6 py-10 sm:py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            Mechanics · How it works
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            Skill-aligned, lightweight, abuse-resistant
          </h2>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            The matchmaker is a routed introduction, not a booking system.
            You browse teams; you fire one canned request; the other team
            picks it up in-app and on Discord.
          </p>
        </div>

        <div className="space-y-6">
          <BulletGroup
            label="How matches are ranked"
            items={[
              "Same TSR region preferred (NA / EMEA)",
              "Closest absolute TSR distance, lowest first",
              "Same scrim bracket, then adjacent bracket bands",
              "Bonus when this week's availability overlaps",
              "Recently messaged teams sink to the bottom",
            ]}
          />
          <BulletGroup
            label="What gets sent"
            items={[
              "A non-customizable message with your team's bracket and TSR",
              "Top five rostered players' battletags and TSRs",
              "Delivered in-app to owners and managers, plus Discord if configured",
            ]}
          />
          <BulletGroup
            label="Rate limits"
            items={[
              "One request per pair, per direction, per 24 hours",
              "Up to ten outgoing requests per team per 24 hours",
            ]}
          />
        </div>
      </section>

      <section className="border-border border-t pt-10 sm:pt-12">
        <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              Pick a team · Start
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              Which roster are you searching from?
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              Each team you belong to has its own Team TSR. Choose the one
              you want to scrim with — only teams with a Team TSR can be
              searched from.
            </p>
          </div>

          <div>
            {teams.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="border-border divide-border bg-card divide-y overflow-hidden rounded-xl border">
                {teams.map((t) => (
                  <TeamRow key={t.id} team={t} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function TeamRow({ team }: { team: HubTeam }) {
  const eligible = team.hasSnapshot;
  const href = `/matchmaker/${team.id}` as Route;

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium tracking-tight">
            {team.name}
          </span>
          {team.bracketLabel ? (
            <Badge variant="outline" className="font-mono">
              {team.bracketLabel}
            </Badge>
          ) : null}
          {team.region ? (
            <Badge variant="outline" className="font-mono">
              {team.region}
            </Badge>
          ) : null}
        </div>
        {team.rating !== null ? (
          <div className="text-muted-foreground mt-1 font-mono text-[11px] tabular-nums tracking-[0.08em] uppercase">
            TSR {team.rating.toLocaleString()}
          </div>
        ) : (
          <div className="text-muted-foreground mt-1 font-mono text-[11px] tracking-[0.16em] uppercase">
            No Team TSR yet
          </div>
        )}
      </div>
      {eligible ? (
        <Button asChild size="sm" className="h-9 rounded-md px-3 text-sm">
          <Link href={href}>
            Search as {team.name}
            <ArrowRightIcon className="ml-1.5 size-3.5" aria-hidden />
          </Link>
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled
          className="h-9 rounded-md px-3 text-sm"
          title="Team needs a Team TSR before matchmaking"
        >
          Not yet eligible
        </Button>
      )}
    </li>
  );
}

function EmptyState() {
  return (
    <div className="border-border bg-card rounded-xl border p-8 text-center">
      <h3 className="text-base font-semibold tracking-tight">
        You&apos;re not on any teams yet
      </h3>
      <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm leading-relaxed">
        Join or create a team first, then return here to find scrim
        partners.
      </p>
      <Link
        href={"/team" as Route}
        className="text-primary mt-5 inline-block font-mono text-[11px] tracking-[0.16em] uppercase hover:underline"
      >
        Manage teams →
      </Link>
    </div>
  );
}

function BulletGroup({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase">
        {label}
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="text-foreground text-sm leading-relaxed"
          >
            <span
              aria-hidden
              className="text-muted-foreground/70 mr-2 font-mono text-xs"
            >
              ·
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

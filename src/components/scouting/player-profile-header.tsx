"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayerProfile } from "@/data/player/types";
import { cn, format, toHero } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

type PlayerProfileHeaderProps = {
  profile: PlayerProfile;
};

export function PlayerProfileHeader({ profile }: PlayerProfileHeaderProps) {
  const t = useTranslations("scoutingPage.player.profile");

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{profile.name}</h1>
          {profile.team && (
            <span className="text-muted-foreground text-lg">
              {profile.team}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RoleBadge role={profile.role} />
          <StatusBadge status={profile.status} />
          {profile.region && <Badge variant="outline">{profile.region}</Badge>}
          {profile.country && (
            <span className="text-muted-foreground text-sm">
              {profile.country}
            </span>
          )}
          <a
            href={profile.playerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground ml-auto inline-flex items-center gap-1 text-sm transition-colors"
          >
            {t("liquipediaProfile")}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("careerWinnings")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              ${format(profile.winnings)}
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("signatureHeroes")}</CardTitle>
          </CardHeader>
          <CardContent>
            {profile.signatureHeroes.length > 0 ? (
              <div className="flex items-center gap-2">
                {profile.signatureHeroes.slice(0, 3).map((hero) => (
                  <div key={hero} className="flex items-center gap-1.5">
                    <Image
                      src={`/heroes/${toHero(hero)}.png`}
                      alt={hero}
                      width={32}
                      height={32}
                      className="rounded"
                    />
                    <span className="text-sm">{hero}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">--</p>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("tournamentAppearances")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {profile.totalTournaments}
            </p>
            <p className="text-muted-foreground text-sm">
              {t("tournaments", { count: profile.totalTournaments })}
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("competitiveMaps")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {profile.competitiveMapCount}
            </p>
            <p className="text-muted-foreground text-sm">
              {t("maps", { count: profile.competitiveMapCount })}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (!role) return null;

  const colorClass =
    role === "Tank"
      ? "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400"
      : role === "DPS"
        ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
        : role === "Support"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : undefined;

  return (
    <Badge variant="secondary" className={cn(colorClass)}>
      {role}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (!status) return null;

  const colorClass =
    status === "Active"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : status === "Retired"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : undefined;

  return (
    <Badge variant="outline" className={cn(colorClass)}>
      {status}
    </Badge>
  );
}

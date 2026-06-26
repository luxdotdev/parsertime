import { PlayerHoverCard } from "@/components/player/hover-card";
import { SectionHeader } from "@/components/stats/team/section-header";
import { SubstituteToggle } from "@/components/stats/team/substitute-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/components/ui/link";
import prisma from "@/lib/prisma";
import { Target } from "lucide-react";
import type { Route } from "next";
import { getTranslations } from "next-intl/server";

type TeamRosterGridProps = {
  roster: string[];
  teamId: number;
  isManager: boolean;
  substitutes: string[];
};

async function getPlayerData(playerName: string) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { equals: playerName, mode: "insensitive" } },
        { battletag: { equals: playerName, mode: "insensitive" } },
      ],
    },
    select: {
      name: true,
      image: true,
      battletag: true,
    },
  });

  return user;
}

export async function TeamRosterGrid({
  roster,
  teamId,
  isManager,
  substitutes,
}: TeamRosterGridProps) {
  const t = await getTranslations("teamStatsPage.teamRosterGrid");
  const subSet = new Set(substitutes);

  const playerTargetsLink = (
    <Link
      href={`/team/${teamId}/targets` as Route}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.16em] uppercase transition-colors"
    >
      <Target className="size-3.5" />
      {t("playerTargets")}
    </Link>
  );

  if (roster.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          rightSlot={playerTargetsLink}
        />
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </section>
    );
  }

  const playersData = await Promise.all(
    roster.map(async (playerName) => {
      const userData = await getPlayerData(playerName);
      return {
        name: playerName,
        image: userData?.image ?? null,
        displayName: userData?.name ?? userData?.battletag ?? playerName,
        isSubstitute: subSet.has(playerName),
      };
    })
  );

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        rightSlot={playerTargetsLink}
      />
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {playersData.map((player) => (
          <div key={player.name} className="flex items-center gap-1">
            <PlayerHoverCard player={player.name}>
              <Link
                href={`/stats/${encodeURIComponent(player.name)}` as Route}
                className="hover:bg-muted/50 flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={player.image ?? undefined}
                    alt={player.displayName}
                  />
                  <AvatarFallback className="text-sm font-bold">
                    {player.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {player.displayName}
                </span>
                {player.isSubstitute && (
                  <Badge
                    variant="secondary"
                    className="font-mono text-[10px] tracking-[0.12em] uppercase"
                  >
                    {t("subBadge")}
                  </Badge>
                )}
              </Link>
            </PlayerHoverCard>
            {isManager && (
              <SubstituteToggle
                teamId={teamId}
                playerName={player.name}
                displayName={player.displayName}
                isSubstitute={player.isSubstitute}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

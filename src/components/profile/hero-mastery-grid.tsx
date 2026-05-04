"use client";

import { Link } from "@/components/ui/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toHero, toTimestampWithHours } from "@/lib/utils";
import { heroRoleMapping, type HeroName } from "@/types/heroes";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import Image from "next/image";

type HeroData = {
  player_hero: string;
  total_time_played: number;
  hero_rating: number;
  mapsPlayed: number;
  percentile: string;
  rank: number;
};

type HeroMasteryGridProps = {
  heroesData: HeroData[];
};

type SRTier = {
  name: string;
  color: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  rankImage: string | null;
};

function getSRTier(sr: number): SRTier {
  if (sr === 0) {
    return {
      name: "Unplaced",
      color: "gray",
      borderColor: "border-gray-500",
      bgColor: "bg-gray-500/10",
      textColor: "text-gray-500",
      rankImage: null,
    };
  }
  if (sr < 1500) {
    return {
      name: "Bronze",
      color: "bronze",
      borderColor: "border-amber-900",
      bgColor: "bg-amber-900/10",
      textColor: "text-amber-900",
      rankImage: "/ranks/bronze.png",
    };
  }
  if (sr < 2000) {
    return {
      name: "Silver",
      color: "silver",
      borderColor: "border-gray-400",
      bgColor: "bg-gray-400/10",
      textColor: "text-gray-400",
      rankImage: "/ranks/silver.png",
    };
  }
  if (sr < 2500) {
    return {
      name: "Gold",
      color: "gold",
      borderColor: "border-amber-400",
      bgColor: "bg-amber-400/10",
      textColor: "text-amber-400",
      rankImage: "/ranks/gold.png",
    };
  }
  if (sr < 3000) {
    return {
      name: "Platinum",
      color: "platinum",
      borderColor: "border-gray-300",
      bgColor: "bg-gray-300/10",
      textColor: "text-gray-300",
      rankImage: "/ranks/platinum.png",
    };
  }
  if (sr < 3500) {
    return {
      name: "Diamond",
      color: "diamond",
      borderColor: "border-sky-300",
      bgColor: "bg-sky-300/10",
      textColor: "text-sky-300",
      rankImage: "/ranks/diamond.png",
    };
  }
  if (sr < 4000) {
    return {
      name: "Masters",
      color: "masters",
      borderColor: "border-emerald-500",
      bgColor: "bg-emerald-500/10",
      textColor: "text-emerald-500",
      rankImage: "/ranks/masters.png",
    };
  }
  if (sr < 4500) {
    return {
      name: "Grandmaster",
      color: "grandmaster",
      borderColor: "border-indigo-400",
      bgColor: "bg-indigo-400/10",
      textColor: "text-indigo-400",
      rankImage: "/ranks/grandmaster.png",
    };
  }
  return {
    name: "Champion",
    color: "champion",
    borderColor: "border-violet-500",
    bgColor: "bg-violet-500/10",
    textColor: "text-violet-500",
    rankImage: "/ranks/champion.png",
  };
}

function HeroTile({ hero }: { hero: HeroData }) {
  const t = useTranslations("heroes");
  const tier = getSRTier(hero.hero_rating);
  const heroName = toHero(hero.player_hero);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={`/leaderboard/csr?hero=${hero.player_hero}` as Route}
            target="_blank"
            className="bg-card hover:bg-muted/40 group flex items-center gap-3 px-3 py-3 transition-colors"
          >
            <Image
              src={`/heroes/${heroName}.png`}
              alt={hero.player_hero}
              width={256}
              height={256}
              className="ring-foreground/10 size-10 shrink-0 rounded-md object-cover ring-1"
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">
                {t(heroName)}
              </span>
              {hero.hero_rating > 0 ? (
                <span className="text-muted-foreground/80 font-mono text-[0.625rem] tracking-[0.06em] uppercase">
                  {tier.name}
                </span>
              ) : (
                <span className="text-muted-foreground/80 font-mono text-[0.625rem] tracking-[0.06em] uppercase">
                  {hero.mapsPlayed}/10 maps
                </span>
              )}
            </div>
            {hero.hero_rating > 0 ? (
              <span className="font-mono text-sm font-semibold tabular-nums">
                {hero.hero_rating}
              </span>
            ) : (
              <span className="text-muted-foreground/60 font-mono text-xs">
                —
              </span>
            )}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{t(heroName)}</p>
            <div className="space-y-0.5 text-xs">
              {hero.hero_rating > 0 ? (
                <>
                  <p>SR: {hero.hero_rating}</p>
                  <p>Rank: #{hero.rank}</p>
                  <p>Percentile: Top {hero.percentile}%</p>
                </>
              ) : (
                <p>Maps: {hero.mapsPlayed}/10 (Unplaced)</p>
              )}
              <p>Time Played: {toTimestampWithHours(hero.total_time_played)}</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function RoleSection({
  roleName,
  heroes,
}: {
  roleName: string;
  heroes: HeroData[];
}) {
  if (heroes.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-3">
        <h4 className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.16em] uppercase">
          {roleName}
        </h4>
        <span className="text-muted-foreground/70 font-mono text-[0.6875rem] tabular-nums">
          {heroes.length}
        </span>
      </div>
      <div className="bg-border grid grid-cols-1 gap-px sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {heroes.map((hero) => (
          <HeroTile key={hero.player_hero} hero={hero} />
        ))}
      </div>
    </div>
  );
}

export function HeroMasteryGrid({ heroesData }: HeroMasteryGridProps) {
  const groupedByRole: Record<"Tank" | "Damage" | "Support", HeroData[]> = {
    Tank: [],
    Damage: [],
    Support: [],
  };

  heroesData.forEach((hero) => {
    const role = heroRoleMapping[hero.player_hero as HeroName];
    if (role) {
      groupedByRole[role].push(hero);
    }
  });

  groupedByRole.Tank.sort((a, b) => b.hero_rating - a.hero_rating);
  groupedByRole.Damage.sort((a, b) => b.hero_rating - a.hero_rating);
  groupedByRole.Support.sort((a, b) => b.hero_rating - a.hero_rating);

  if (heroesData.length === 0) {
    return (
      <div className="bg-card text-muted-foreground flex h-32 items-center justify-center px-5 text-sm">
        No hero data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RoleSection roleName="Tank" heroes={groupedByRole.Tank} />
      <RoleSection roleName="Damage" heroes={groupedByRole.Damage} />
      <RoleSection roleName="Support" heroes={groupedByRole.Support} />
    </div>
  );
}

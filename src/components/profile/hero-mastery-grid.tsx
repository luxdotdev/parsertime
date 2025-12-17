"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toHero, toTimestampWithHours } from "@/lib/utils";
import { heroRoleMapping, type HeroName } from "@/types/heroes";
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
          <div
            className={`group relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all duration-200 hover:scale-105 hover:shadow-lg ${tier.borderColor} ${tier.bgColor}`}
          >
            <div className="relative h-16 w-16 overflow-hidden rounded-full">
              <Image
                src={`/heroes/${heroName}.png`}
                alt={hero.player_hero}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-center text-xs font-semibold">
                {t(heroName)}
              </span>
              {hero.hero_rating > 0 ? (
                <div className="flex items-center gap-1">
                  {tier.rankImage && (
                    <Image
                      src={tier.rankImage}
                      alt={tier.name}
                      width={16}
                      height={16}
                    />
                  )}
                  <span className={`text-xs font-bold ${tier.textColor}`}>
                    {hero.hero_rating}
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground text-xs">Unplaced</span>
              )}
            </div>
          </div>
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
  roleColor,
}: {
  roleName: string;
  heroes: HeroData[];
  roleColor: string;
}) {
  if (heroes.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`h-4 w-4 rounded-full ${roleColor}`} />
        <h4 className="font-semibold">{roleName}</h4>
        <span className="text-muted-foreground text-sm">({heroes.length})</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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

  return (
    <div className="bg-card text-card-foreground rounded-xl pt-6 shadow">
      <h3 className="mb-4 leading-none font-semibold tracking-tight">
        Hero Mastery
      </h3>
      <div className="space-y-6">
        <RoleSection
          roleName="Tank"
          heroes={groupedByRole.Tank}
          roleColor="bg-blue-500"
        />
        <RoleSection
          roleName="Damage"
          heroes={groupedByRole.Damage}
          roleColor="bg-red-500"
        />
        <RoleSection
          roleName="Support"
          heroes={groupedByRole.Support}
          roleColor="bg-green-500"
        />
      </div>
      {heroesData.length === 0 && (
        <div className="text-muted-foreground py-8 text-center text-sm">
          No hero data available
        </div>
      )}
    </div>
  );
}

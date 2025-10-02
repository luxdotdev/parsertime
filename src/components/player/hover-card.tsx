import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { toHero, toTimestampWithHours, useHeroNames } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { z } from "zod";

async function getTop3Heroes(player: string) {
  const resultSchema = z.array(
    z.object({
      player_hero: z.string(),
      total_time_played: z.number(),
      hero_rating: z.number(),
      mapsPlayed: z.number(),
    })
  );

  const response = await fetch(`/api/player/top-3-heroes?player=${player}`);
  const data = await response.json();

  const parsedData = resultSchema.safeParse(data);
  return parsedData.success ? parsedData.data : [];
}

function displayHeroRating(heroRating: number, mapsPlayed: number) {
  if (heroRating === 0) {
    return (
      <div className="items-center gap-1">
        <p className="text-muted-foreground text-xs">Unplaced</p>
        <p className="text-muted-foreground text-xs">({mapsPlayed}/10 maps)</p>
      </div>
    );
  }

  switch (true) {
    case heroRating < 1500:
      // Bronze
      return (
        <div className="flex items-center gap-1">
          <Image src="/ranks/bronze.png" alt="Bronze" width={16} height={16} />
          <span className="text-xs text-amber-900">{heroRating} SR</span>
        </div>
      );
    case heroRating < 2000:
      // Silver
      return (
        <div className="flex items-center gap-1">
          <Image src="/ranks/silver.png" alt="Silver" width={16} height={16} />
          <span className="text-xs text-gray-400">{heroRating} SR</span>
        </div>
      );
    case heroRating < 2500:
      // Gold
      return (
        <div className="flex items-center gap-1">
          <Image src="/ranks/gold.png" alt="Gold" width={16} height={16} />
          <span className="text-xs text-amber-400">{heroRating} SR</span>
        </div>
      );
    case heroRating < 3000:
      // Platinum
      return (
        <div className="flex items-center gap-1">
          <Image
            src="/ranks/platinum.png"
            alt="Platinum"
            width={16}
            height={16}
          />
          <span className="text-xs text-gray-500 dark:text-gray-300">
            {heroRating} SR
          </span>
        </div>
      );
    case heroRating < 3500:
      // Diamond
      return (
        <div className="flex items-center gap-1">
          <Image
            src="/ranks/diamond.png"
            alt="Diamond"
            width={16}
            height={16}
          />
          <span className="text-xs text-sky-300">{heroRating} SR</span>
        </div>
      );
    case heroRating < 4000:
      // Master
      return (
        <div className="flex items-center gap-1">
          <Image src="/ranks/master.png" alt="Master" width={16} height={16} />
          <span className="text-xs text-emerald-500">{heroRating} SR</span>
        </div>
      );
    case heroRating < 4500:
      // Grandmaster
      return (
        <div className="flex items-center gap-1">
          <Image
            src="/ranks/grandmaster.png"
            alt="Grandmaster"
            width={16}
            height={16}
          />
          <span className="text-xs text-indigo-400">{heroRating} SR</span>
        </div>
      );
    case heroRating < 5000:
      // Champion
      return (
        <div className="flex items-center gap-1">
          <Image
            src="/ranks/champion.png"
            alt="Champion"
            width={16}
            height={16}
          />
          <span className="text-xs text-violet-500">{heroRating} SR</span>
        </div>
      );
    default:
      return (
        <div className="items-center gap-1">
          <p className="text-muted-foreground text-xs">Unplaced</p>
          <p className="text-muted-foreground text-xs">
            ({mapsPlayed}/10 maps)
          </p>
        </div>
      );
  }
}

export function PlayerHoverCard({
  player,
  children,
}: {
  player: string;
  children: React.ReactNode;
}) {
  const {
    data: top3Heroes,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["top3Heroes", player],
    queryFn: () => getTop3Heroes(player),
  });

  const heroNames = useHeroNames();

  return (
    <HoverCard>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-4">
          {/* Player name section */}
          <div className="text-center">
            <h3 className="text-lg font-semibold">{player}</h3>
          </div>

          {/* Top 3 heroes section */}
          <div className="space-y-2">
            <h4 className="text-muted-foreground text-sm font-medium">
              Most Played Heroes
            </h4>
            {isLoading && (
              <div className="text-muted-foreground text-sm">Loading...</div>
            )}
            {isError && (
              <div className="text-destructive text-sm">
                Error loading hero data
              </div>
            )}
            {top3Heroes && top3Heroes.length > 0 && (
              <div className="flex justify-center gap-4">
                {top3Heroes.map((hero) => (
                  <div
                    key={hero.player_hero}
                    className="flex flex-col items-center space-y-1"
                  >
                    <Image
                      src={`/heroes/${toHero(hero.player_hero)}.png`}
                      alt={`${hero.player_hero} hero portrait`}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded border"
                    />
                    <span className="text-center text-xs font-medium">
                      {heroNames.get(toHero(hero.player_hero)) ??
                        hero.player_hero}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {toTimestampWithHours(hero.total_time_played)}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {displayHeroRating(hero.hero_rating, hero.mapsPlayed)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {top3Heroes && top3Heroes.length === 0 && (
              <div className="text-muted-foreground text-center text-sm">
                No hero data available
              </div>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

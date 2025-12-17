"use client";

import { HeroRating } from "@/components/profile/hero-rating";
import { SupporterHeart } from "@/components/profile/supporter-heart";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Link } from "@/components/ui/link";
import { toHero, toTimestampWithHours, useHeroNames } from "@/lib/utils";
import { BillingPlan } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { z } from "zod";

async function getTop3Heroes(player: string) {
  const resultSchema = z.object({
    player: z.object({
      name: z.string(),
      image: z.string().nullable(),
      bannerImage: z.string().nullable(),
      title: z.string().nullable(),
      billingPlan: z.enum(BillingPlan),
    }),
    heroes: z.array(
      z.object({
        player_hero: z.string(),
        total_time_played: z.number(),
        hero_rating: z.number(),
        mapsPlayed: z.number(),
        rank: z.number(),
        percentile: z.string(),
      })
    ),
  });

  const response = await fetch(`/api/player/top-3-heroes?player=${player}`);
  const data = await response.json();

  const parsedData = resultSchema.safeParse(data);
  return parsedData.success
    ? parsedData.data
    : {
        player: {
          name: player,
          image: null,
          bannerImage: null,
          title: null,
          billingPlan: BillingPlan.FREE,
        },
        heroes: [],
      };
}

export function PlayerHoverCard({
  player,
  children,
}: {
  player: string;
  children: React.ReactNode;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["top3Heroes", player],
    queryFn: () => getTop3Heroes(player),
  });

  const heroNames = useHeroNames();
  const heroes = data?.heroes ?? [];
  const playerData = data?.player ?? {
    name: player,
    image: null,
    bannerImage: null,
    title: null,
    billingPlan: BillingPlan.FREE,
  };
  const maxTimePlayed =
    heroes.length > 0 ? Math.max(...heroes.map((h) => h.total_time_played)) : 1;

  const t = useTranslations("titles");

  return (
    <HoverCard>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80 overflow-hidden p-0">
        {/* Banner */}
        <div className="relative h-20 w-full bg-gradient-to-r from-blue-600 to-purple-600">
          {playerData.bannerImage && (
            <Image
              src={playerData.bannerImage}
              alt={`${playerData.name} banner`}
              fill
              className="object-cover"
              priority
            />
          )}
          <div className="absolute inset-0 bg-black/20" />
        </div>

        <div className="px-4 pb-4">
          <div className="-mt-8 mb-4 flex items-end gap-3">
            <Avatar className="border-background h-20 w-20 border-4 shadow-sm">
              <AvatarImage
                src={playerData.image ?? undefined}
                alt={playerData.name}
              />
              <AvatarFallback className="text-xl font-bold">
                {playerData.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="mt-6 mb-1">
              <h4 className="flex items-center gap-1 text-lg leading-none font-bold">
                {playerData.name}{" "}
                <SupporterHeart
                  billingPlan={playerData.billingPlan}
                  className="h-4 w-4"
                />
              </h4>
              {playerData.title ? (
                <p className="text-muted-foreground mt-1 text-xs font-semibold tracking-wider uppercase">
                  {t(playerData.title)}
                </p>
              ) : (
                <div className="h-4 w-4" aria-hidden="true" /> // Empty space for the title
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-muted-foreground flex items-center justify-between px-1 text-xs font-medium">
              <span>Top Heroes</span>
              <span>Time Played</span>
            </div>

            {isLoading && (
              <div className="text-muted-foreground py-4 text-center text-sm">
                Loading...
              </div>
            )}

            {isError && (
              <div className="text-destructive py-4 text-center text-sm">
                Error loading data
              </div>
            )}

            {!isLoading && !isError && heroes.length === 0 && (
              <div className="text-muted-foreground py-4 text-center text-sm">
                No data available
              </div>
            )}

            {!isLoading &&
              !isError &&
              heroes.map((hero) => (
                <div key={hero.player_hero} className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="flex min-w-[100px] flex-col gap-0.5">
                      <span className="text-sm font-medium">
                        {heroNames.get(toHero(hero.player_hero)) ??
                          hero.player_hero}
                      </span>
                      <HeroRating
                        heroRating={hero.hero_rating}
                        mapsPlayed={hero.mapsPlayed}
                        rank={hero.rank}
                        percentile={hero.percentile}
                      />
                    </div>
                    <div className="flex flex-1 items-center gap-2">
                      <div className="bg-muted h-3 flex-1 overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full"
                          style={{
                            width: `${(hero.total_time_played / maxTimePlayed) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-muted-foreground min-w-[60px] text-right text-xs">
                        {toTimestampWithHours(hero.total_time_played)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
        {/* Add a lighter color card section with a link to the player's profile */}
        <div className="bg-muted text-primary p-2 text-center">
          <Link href={`/profile/${player}` as Route}>View Profile &rarr;</Link>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

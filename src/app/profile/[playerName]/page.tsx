import { Achievements } from "@/components/profile/achievements";
import { CalculatedStatsBlock } from "@/components/profile/calculated-stats-block";
import { HeroMasteryGrid } from "@/components/profile/hero-mastery-grid";
import { HeroRating } from "@/components/profile/hero-rating";
import { PersonalRecords } from "@/components/profile/personal-records";
import { PlayStyleIndicator } from "@/components/profile/play-style-indicator";
import { PositioningCard } from "@/components/profile/positioning-card";
import { ProfileHeader } from "@/components/profile/profile-header";
import { RecentActivityCalendar } from "@/components/profile/recent-activity-calendar";
import { SkillRatingDetail } from "@/components/profile/skill-rating-card";
import {
  RangePicker,
  type Timeframe,
} from "@/components/stats/player/range-picker";
import { SectionHeader } from "@/components/stats/team/section-header";
import { StatRibbon } from "@/components/stats/team/stat-ribbon";
import { PlayerTargetsTab } from "@/components/targets/player-targets-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrimService } from "@/data/scrim";
import {
  calculateTargetProgress,
  TargetsService,
  type TargetProgress,
} from "@/data/player";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth, getViewableScrimIds } from "@/lib/auth";
import { positionalData } from "@/lib/flags";
import { getCompositeSRLeaderboard } from "@/lib/hero-rating";
import { Permission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getPlayerTsrByBattletag } from "@/lib/tsr/lookup";
import type { RoleName } from "@/lib/target-stats";
import { cn, toHero, toTimestampWithHours } from "@/lib/utils";
import { type HeroName, heroRoleMapping } from "@/types/heroes";
import type { PagePropsWithLocale } from "@/types/next";
import { $Enums, Prisma, type Scrim } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

type HeroData = {
  player_hero: string;
  total_time_played: number;
  hero_rating: number;
  mapsPlayed: number;
  percentile: string;
  rank: number;
};

const tabTriggerClass =
  "text-muted-foreground hover:text-foreground data-[state=active]:text-foreground border-0 border-b-2 border-b-transparent data-[state=active]:border-b-primary rounded-none bg-transparent px-0 pb-3 pt-1 font-mono text-[11px] tracking-[0.16em] uppercase shadow-none data-[state=active]:shadow-none data-[state=active]:bg-transparent dark:bg-transparent dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-primary transition-colors";

const ROLE_HUE_CLASS: Record<"Tank" | "Damage" | "Support", string> = {
  Tank: "bg-sky-500/80",
  Damage: "bg-rose-500/80",
  Support: "bg-emerald-500/80",
};

export default async function ProfilePage(
  props: PagePropsWithLocale<"/profile/[playerName]">
) {
  const params = await props.params;
  const name = decodeURIComponent(params.playerName);
  const t = await getTranslations("heroes");
  const session = await auth();
  const sessionUser = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session?.user?.email)))
  );

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { equals: name, mode: "insensitive" } },
        { battletag: { equals: name, mode: "insensitive" } },
      ],
    },
  });

  const playerScrims = await prisma.playerStat.findMany({
    where: { player_name: { equals: name, mode: "insensitive" } },
    select: { scrimId: true },
    distinct: ["scrimId"],
  });
  const scrimIds = playerScrims.map((scrim) => scrim.scrimId);
  const viewableScrimIds = await getViewableScrimIds(scrimIds, sessionUser);
  const canUseFullProfileRatings = viewableScrimIds.length === scrimIds.length;

  const [timeframe1, timeframe2, timeframe3] = await Promise.all([
    new Permission("stats-timeframe-1").check(),
    new Permission("stats-timeframe-2").check(),
    new Permission("stats-timeframe-3").check(),
  ]);

  const permissions = {
    "stats-timeframe-1": timeframe1,
    "stats-timeframe-2": timeframe2,
    "stats-timeframe-3": timeframe3,
  };

  let appliedTitle = null;
  if (user) {
    appliedTitle = await prisma.appliedTitle.findFirst({
      where: { userId: user?.id },
      select: { title: true },
    });
  }

  const playerData = {
    name: user?.name ?? name,
    image: user?.image ?? null,
    bannerImage: user?.bannerImage ?? null,
    title: appliedTitle?.title ?? null,
    billingPlan: user?.billingPlan ?? $Enums.BillingPlan.FREE,
    email: user?.email ?? null,
  };

  type HeroPlayTime = {
    player_hero: string;
    total_time_played: number;
  };

  const heroesPlayed =
    viewableScrimIds.length === 0
      ? []
      : await prisma.$queryRaw<HeroPlayTime[]>`
    WITH final_rows AS (
      SELECT DISTINCT ON ("MapDataId", player_name, player_hero)
        player_hero,
        hero_time_played
      FROM
        "PlayerStat"
      WHERE
        player_name ILIKE ${name}
        AND "scrimId" IN (${Prisma.join(viewableScrimIds)})
        AND hero_time_played > 0
      ORDER BY
        "MapDataId",
        player_name,
        player_hero,
        round_number DESC,
        id DESC
    )
    SELECT
      player_hero,
      SUM(hero_time_played) AS total_time_played
    FROM
      final_rows
    GROUP BY
      player_hero
    ORDER BY
      total_time_played DESC
  `;

  const heroRatings = await Promise.all(
    heroesPlayed.map(async (hero) => {
      const compositeLeaderboard = canUseFullProfileRatings
        ? await getCompositeSRLeaderboard({
            hero: hero.player_hero as HeroName,
            player: name,
            limit: 300,
          })
        : null;

      if (!compositeLeaderboard) {
        const mapsPlayed = await prisma.playerStat.groupBy({
          by: ["MapDataId"],
          where: {
            player_name: { equals: name, mode: "insensitive" },
            player_hero: hero.player_hero as HeroName,
            hero_time_played: { gt: 60 },
            scrimId: { in: viewableScrimIds },
          },
        });

        return {
          ...hero,
          hero_rating: 0,
          mapsPlayed: mapsPlayed.length,
          percentile: "0",
          rank: 0,
        } as unknown as HeroData;
      }

      return {
        ...hero,
        hero_rating: compositeLeaderboard.composite_sr ?? 0,
        mapsPlayed: compositeLeaderboard.maps ?? 0,
        percentile: compositeLeaderboard.percentile ?? "0",
        rank: compositeLeaderboard.rank ?? 0,
      } as unknown as HeroData;
    })
  );

  const allHeroesData: HeroData[] = heroesPlayed.map((hero) => {
    const ratedHero = heroRatings.find(
      (h) => h.player_hero === hero.player_hero
    );
    if (ratedHero) return ratedHero;
    return {
      ...hero,
      hero_rating: 0,
      mapsPlayed: 0,
      percentile: "0",
      rank: 0,
    };
  });

  const top3Heroes = allHeroesData.slice(0, 3);

  const peakHero = allHeroesData.reduce<HeroData | null>(
    (best, h) => (h.hero_rating > (best?.hero_rating ?? 0) ? h : best),
    null
  );
  const peakCsr = {
    rating: peakHero?.hero_rating ?? 0,
    hero: peakHero?.player_hero ?? null,
    mapsPlayed: peakHero?.mapsPlayed ?? 0,
  };

  const tsrSnapshot = await getPlayerTsrByBattletag([user?.battletag, name]);

  const roleData: Record<
    "Tank" | "Damage" | "Support",
    { time: number; sr: number }
  > = {
    Tank: { time: 0, sr: 0 },
    Damage: { time: 0, sr: 0 },
    Support: { time: 0, sr: 0 },
  };

  allHeroesData.forEach((hero) => {
    const role = heroRoleMapping[hero.player_hero as HeroName];
    if (role) {
      roleData[role].time += hero.total_time_played;
      if (hero.hero_rating > 0) {
        roleData[role].sr = Math.max(roleData[role].sr, hero.hero_rating);
      }
    }
  });

  const allScrims = await prisma.scrim.findMany({
    where: { id: { in: viewableScrimIds } },
  });

  const oneWeek = new Date();
  oneWeek.setDate(oneWeek.getDate() - 7);
  const oneWeekScrims = allScrims.filter((scrim) => scrim.date >= oneWeek);

  const twoWeeks = new Date();
  twoWeeks.setDate(twoWeeks.getDate() - 14);
  const twoWeeksScrims = allScrims.filter((scrim) => scrim.date >= twoWeeks);

  const oneMonth = new Date();
  oneMonth.setMonth(oneMonth.getMonth() - 1);
  const monthScrims = allScrims.filter((scrim) => scrim.date >= oneMonth);

  const threeMonths = new Date();
  threeMonths.setMonth(threeMonths.getMonth() - 3);
  const threeMonthsScrims = allScrims.filter(
    (scrim) => scrim.date >= threeMonths
  );

  const sixMonths = new Date();
  sixMonths.setMonth(sixMonths.getMonth() - 6);
  const sixMonthsScrims = allScrims.filter((scrim) => scrim.date >= sixMonths);

  const year = new Date();
  year.setFullYear(year.getFullYear() - 1);
  const yearScrims = allScrims.filter((scrim) => scrim.date >= year);

  const data: Record<Timeframe, Scrim[]> = {
    "one-week": oneWeekScrims,
    "two-weeks": twoWeeksScrims,
    "one-month": monthScrims,
    "three-months": threeMonthsScrims,
    "six-months": sixMonthsScrims,
    "one-year": yearScrims,
    "all-time": allScrims,
    custom: [],
  };

  const permitted = timeframe3
    ? "all-time"
    : timeframe2
      ? "six-months"
      : "one-month";

  const permittedScrimIds = data[permitted].map((scrim) => scrim.id);
  const responseScrims = {
    "one-week": data["one-week"],
    "two-weeks": data["two-weeks"],
    "one-month": data["one-month"],
    "three-months": timeframe2 || timeframe3 ? data["three-months"] : [],
    "six-months": timeframe2 || timeframe3 ? data["six-months"] : [],
    "one-year": timeframe3 ? data["one-year"] : [],
    "all-time": timeframe3 ? data["all-time"] : [],
    custom: [],
  };

  const calculatedStats = await prisma.calculatedStat.findMany({
    where: {
      playerName: { equals: name, mode: "insensitive" },
      scrimId: { in: permittedScrimIds },
    },
  });

  const showPositioning = await positionalData();

  const { stats, kills, deaths, mapWinrates } = await AppRuntime.runPromise(
    Effect.all(
      {
        stats: ScrimService.pipe(
          Effect.flatMap((svc) =>
            svc.getAllStatsForPlayer(permittedScrimIds, name)
          )
        ),
        kills: ScrimService.pipe(
          Effect.flatMap((svc) =>
            svc.getAllKillsForPlayer(permittedScrimIds, name)
          )
        ),
        deaths: ScrimService.pipe(
          Effect.flatMap((svc) =>
            svc.getAllDeathsForPlayer(permittedScrimIds, name)
          )
        ),
        mapWinrates: ScrimService.pipe(
          Effect.flatMap((svc) =>
            svc.getAllMapWinratesForPlayer(permittedScrimIds, name)
          )
        ),
      },
      { concurrency: "unbounded" }
    )
  );

  const maxTimePlayed = Math.max(
    ...allHeroesData.map((h) => h.total_time_played),
    1
  );

  const totalHours = allHeroesData.reduce(
    (acc, hero) => acc + hero.total_time_played,
    0
  );
  const totalHoursLabel =
    totalHours / 3600 >= 10
      ? `${Math.floor(totalHours / 3600)}h`
      : `${(totalHours / 3600).toFixed(1)}h`;

  const placedHeroes = allHeroesData.filter((h) => h.hero_rating > 0).length;
  const uniqueScrimDates = new Set(
    allScrims.map((s) => new Date(s.date).toISOString().split("T")[0])
  ).size;

  const isOwnProfile =
    user && session?.user?.email && session.user.email === user.email;
  const isAdmin = sessionUser?.role === $Enums.UserRole.ADMIN;
  const canViewTargets = [isOwnProfile, isAdmin].some(Boolean);

  let targetProgress: TargetProgress[] = [];
  let targetScrimStats: {
    scrimId: number;
    scrimDate: string;
    scrimName: string;
    stats: Record<string, number>;
  }[] = [];
  let playerPrimaryRole: RoleName = "Damage";

  if (canViewTargets) {
    const targetTeamId = user?.teamId ?? null;

    if (targetTeamId) {
      if (allHeroesData.length > 0) {
        const topRole =
          heroRoleMapping[allHeroesData[0].player_hero as HeroName];
        if (topRole) playerPrimaryRole = topRole;
      }

      const targets = await AppRuntime.runPromise(
        TargetsService.pipe(
          Effect.flatMap((svc) => svc.getPlayerTargets(targetTeamId, name))
        )
      );
      if (targets.length > 0) {
        const maxWindow = Math.max(...targets.map((t) => t.scrimWindow));
        targetScrimStats = await AppRuntime.runPromise(
          TargetsService.pipe(
            Effect.flatMap((svc) =>
              svc.getRecentScrimStats(name, targetTeamId, maxWindow)
            )
          )
        );
        targetProgress = targets.map((target) => {
          const windowStats = targetScrimStats.slice(-target.scrimWindow);
          const progress = calculateTargetProgress(target, windowStats);
          return { ...progress, target };
        });
      }
    }
  }

  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <ProfileHeader
        player={playerData}
        stats={[
          {
            label: "Peak CSR",
            value: peakCsr.rating > 0 ? peakCsr.rating.toLocaleString() : "—",
            sub:
              peakCsr.rating > 0 && peakCsr.hero
                ? `on ${t(toHero(peakCsr.hero))}`
                : "Unplaced",
          },
          {
            label: "TSR",
            value: tsrSnapshot ? tsrSnapshot.rating.toLocaleString() : "—",
            sub: tsrSnapshot
              ? `${tsrSnapshot.region} · ${tsrSnapshot.matchCount}m`
              : "no FACEIT data",
          },
          {
            label: "Heroes",
            value: allHeroesData.length.toString(),
            sub: placedHeroes > 0 ? `${placedHeroes} placed` : "—",
          },
          {
            label: "Hours",
            value: totalHoursLabel,
            sub: `${allScrims.length} scrims`,
          },
        ]}
      />

      <Tabs defaultValue="overview" className="mt-6 space-y-8">
        <TabsList className="border-border h-auto w-full justify-start gap-6 rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="overview" className={tabTriggerClass}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="progression" className={tabTriggerClass}>
            Progression
          </TabsTrigger>
          <TabsTrigger value="statistics" className={tabTriggerClass}>
            Statistics
          </TabsTrigger>
          {canViewTargets && (
            <TabsTrigger value="targets" className={tabTriggerClass}>
              Targets
            </TabsTrigger>
          )}
          {user && (
            <TabsTrigger value="achievements" className={tabTriggerClass}>
              Achievements
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-12">
          <StatRibbon
            cells={[
              {
                label: "Peak CSR",
                value:
                  peakCsr.rating > 0 ? peakCsr.rating.toLocaleString() : "—",
                sub:
                  peakCsr.rating > 0 && peakCsr.hero
                    ? `${t(toHero(peakCsr.hero))} · ${peakCsr.mapsPlayed} maps`
                    : "no placed heroes",
                emphasis: peakCsr.rating > 0,
              },
              {
                label: "TSR",
                value: tsrSnapshot ? tsrSnapshot.rating.toLocaleString() : "—",
                sub: tsrSnapshot
                  ? `${tsrSnapshot.region} · ${tsrSnapshot.matchCount} matches`
                  : "no FACEIT tournaments",
              },
              {
                label: "Heroes",
                value: allHeroesData.length.toString(),
                sub: `${placedHeroes} placed · ${allHeroesData.length - placedHeroes} unplaced`,
              },
              {
                label: "Days active",
                value: uniqueScrimDates.toString(),
                sub:
                  allScrims.length > 0
                    ? `${allScrims.length} scrims logged`
                    : "no scrims",
              },
            ]}
            columns={4}
          />

          <section className="space-y-4">
            <SectionHeader
              eyebrow="Overview · Skill rating"
              title="Peak CSR and Tournament Skill Rating"
            />
            <SkillRatingDetail peakCsr={peakCsr} tsr={tsrSnapshot} />
          </section>

          {top3Heroes.length > 0 ? (
            <section className="space-y-4">
              <SectionHeader
                eyebrow="Overview · Top heroes"
                title="Most played in this window"
              />
              <div className="bg-border grid grid-cols-1 gap-px sm:grid-cols-3">
                {top3Heroes.map((hero) => (
                  <div
                    key={hero.player_hero}
                    className="bg-card flex items-center gap-4 px-5 py-5"
                  >
                    <Image
                      src={`/heroes/${toHero(hero.player_hero)}.png`}
                      alt={hero.player_hero}
                      width={256}
                      height={256}
                      className="ring-foreground/10 size-14 shrink-0 rounded-md object-cover ring-1"
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-base font-semibold">
                        {t(toHero(hero.player_hero))}
                      </span>
                      <span className="text-muted-foreground/80 font-mono text-[0.625rem] tracking-[0.06em] uppercase">
                        {toTimestampWithHours(hero.total_time_played)}
                      </span>
                      <div className="mt-1.5">
                        <HeroRating
                          heroRating={hero.hero_rating}
                          mapsPlayed={hero.mapsPlayed}
                          rank={hero.rank}
                          percentile={hero.percentile}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {allHeroesData.length > 0 ? (
            <section className="space-y-4">
              <SectionHeader
                eyebrow="Overview · Hero pool"
                title="Time played and rating"
              />
              <ul className="bg-border grid grid-cols-1 gap-px">
                {allHeroesData.slice(0, 8).map((hero) => {
                  const widthPct = Math.max(
                    2,
                    (hero.total_time_played / maxTimePlayed) * 100
                  );
                  return (
                    <li
                      key={hero.player_hero}
                      className="bg-card flex items-center gap-4 px-5 py-3"
                    >
                      <div className="flex min-w-[180px] items-center gap-3">
                        <Image
                          src={`/heroes/${toHero(hero.player_hero)}.png`}
                          alt={hero.player_hero}
                          width={256}
                          height={256}
                          className="ring-foreground/10 size-8 shrink-0 rounded-md object-cover ring-1"
                        />
                        <span className="truncate text-sm font-medium">
                          {t(toHero(hero.player_hero))}
                        </span>
                      </div>
                      <div className="bg-muted/60 relative h-1.5 flex-1 overflow-hidden rounded-full">
                        <div
                          className="bg-primary/70 absolute inset-y-0 left-0"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground w-[88px] shrink-0 text-right font-mono text-xs tabular-nums">
                        {toTimestampWithHours(hero.total_time_played)}
                      </span>
                      <div className="w-[120px] shrink-0 text-right">
                        {hero.hero_rating > 0 ? (
                          <HeroRating
                            heroRating={hero.hero_rating}
                            mapsPlayed={hero.mapsPlayed}
                            rank={hero.rank}
                            percentile={hero.percentile}
                          />
                        ) : (
                          <span className="text-muted-foreground/70 font-mono text-xs">
                            Unplaced
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <section className="space-y-4">
            <SectionHeader
              eyebrow="Overview · Roles"
              title="Time played and peak SR per role"
            />
            <div className="bg-border grid grid-cols-1 gap-px sm:grid-cols-3">
              {(["Tank", "Damage", "Support"] as const).map((role) => (
                <div
                  key={role}
                  className="bg-card flex flex-col gap-2 px-5 py-4"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        ROLE_HUE_CLASS[role]
                      )}
                    />
                    <span className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
                      {role}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-xl font-semibold tabular-nums">
                      {roleData[role].time > 0
                        ? toTimestampWithHours(roleData[role].time)
                        : "—"}
                    </span>
                    {roleData[role].sr > 0 ? (
                      <HeroRating
                        heroRating={roleData[role].sr}
                        mapsPlayed={10}
                        rank={0}
                      />
                    ) : (
                      <span className="text-muted-foreground/70 font-mono text-xs">
                        no peak
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <RecentActivityCalendar scrims={allScrims} />

          <section className="space-y-4">
            <SectionHeader
              eyebrow="Overview · Hero mastery"
              title="Per-hero rank breakdown"
            />
            <HeroMasteryGrid heroesData={allHeroesData} />
          </section>

          <section className="space-y-4">
            <SectionHeader
              eyebrow="Overview · Calculated stats"
              title="MVP, first-pick, fight reversal, and more"
              description="Trends across the chosen timeframe."
            />
            <CalculatedStatsBlock
              calculatedStats={calculatedStats}
              permissions={permissions}
            />
          </section>

          {showPositioning && (
            <section className="space-y-4">
              <SectionHeader
                eyebrow="Overview · Positioning"
                title="Engagement distance, high ground, isolation"
                description="Computed from maps with positional data only."
              />
              <PositioningCard calculatedStats={calculatedStats} />
            </section>
          )}
        </TabsContent>

        <TabsContent value="progression" className="space-y-12">
          <section className="space-y-4">
            <SectionHeader
              eyebrow="Progression · Play style"
              title="Aggression, survivability, impact, clutch"
              description="Built from calculated stats across this player's history."
            />
            <PlayStyleIndicator calculatedStats={calculatedStats} />
          </section>

          <section className="space-y-4">
            <SectionHeader
              eyebrow="Progression · Personal records"
              title="Single-map highs"
            />
            <PersonalRecords stats={stats} heroesData={allHeroesData} />
          </section>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6">
          <RangePicker
            playerName={name}
            permissions={permissions}
            data={responseScrims}
            stats={stats}
            kills={kills}
            mapWinrates={mapWinrates}
            deaths={deaths}
          />
        </TabsContent>
        {canViewTargets && (
          <TabsContent value="targets" className="space-y-6">
            <PlayerTargetsTab
              playerRole={playerPrimaryRole}
              scrimStats={targetScrimStats}
              progress={targetProgress}
            />
          </TabsContent>
        )}
        <TabsContent value="achievements" className="space-y-6">
          <Achievements user={user!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

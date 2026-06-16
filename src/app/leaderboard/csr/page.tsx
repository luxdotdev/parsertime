import { HeroSelector } from "@/components/leaderboard/hero-selector";
import { LeaderboardSubnav } from "@/components/leaderboard/leaderboard-subnav";
import { LeaderboardWithStats } from "@/components/leaderboard/leaderboard-with-stats";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getCompositeSRLeaderboard } from "@/lib/hero-rating";
import { getHeroNames, toHero } from "@/lib/utils";
import { heroRoleMapping, type HeroName } from "@/types/heroes";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("leaderboardPage.csrPage.metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function CsrLeaderboardPage(props: {
  searchParams: Promise<{ hero?: string }>;
}) {
  const [t, heroNames] = await Promise.all([
    getTranslations("leaderboardPage.csrPage"),
    getHeroNames(),
  ]);
  const searchParams = await props.searchParams;
  const heroParam = searchParams.hero;
  const currentHero = (
    heroParam && Object.keys(heroRoleMapping).includes(heroParam)
      ? heroParam
      : undefined
  ) as HeroName | undefined;

  let leaderboard: Awaited<ReturnType<typeof getCompositeSRLeaderboard>> = [];

  if (currentHero) {
    leaderboard = await getCompositeSRLeaderboard({
      hero: currentHero,
      limit: 50,
    });
  }

  const serializedData = Array.isArray(leaderboard)
    ? leaderboard.map((row) => ({
        ...row,
        elims_per10: row.elims_per10 ? Number(row.elims_per10) : undefined,
        fb_per10: row.fb_per10 ? Number(row.fb_per10) : undefined,
        deaths_per10: Number(row.deaths_per10),
        damage_per10: Number(row.damage_per10),
        healing_per10: row.healing_per10
          ? Number(row.healing_per10)
          : undefined,
        blocked_per10: row.blocked_per10
          ? Number(row.blocked_per10)
          : undefined,
        taken_per10: row.taken_per10 ? Number(row.taken_per10) : undefined,
        solo_per10: row.solo_per10 ? Number(row.solo_per10) : undefined,
        ults_per10: row.ults_per10 ? Number(row.ults_per10) : undefined,
        minutes_played: Number(row.minutes_played),
        composite_z_score: Number(row.composite_z_score),
        percentile: row.percentile,
      }))
    : [];
  const role = currentHero ? heroRoleMapping[currentHero] : undefined;
  const currentHeroName = currentHero
    ? (heroNames.get(toHero(currentHero)) ?? currentHero)
    : null;

  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b pb-6">
        <div>
          <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
            {currentHeroName
              ? t("eyebrowWithHero", { hero: currentHeroName })
              : t("eyebrow")}
          </p>
          <h1 className="mt-3 text-4xl leading-none font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-prose text-sm">
            {t("description")}
          </p>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <LeaderboardSubnav />
        <HeroSelector currentHero={currentHero} />
      </div>

      {!currentHero || !role ? (
        <section className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div>
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase">
              {t("empty.eyebrow")}
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">
              {t("empty.title")}
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              {t("empty.description")}
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="how-it-works">
              <AccordionTrigger>
                {t("accordion.calculated.title")}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-sm">
                  <p>{t("accordion.calculated.intro")}</p>
                  <div>
                    <h4 className="font-semibold">
                      {t("accordion.calculated.formulaTitle")}
                    </h4>
                    <p className="mt-1">{t("accordion.calculated.formula")}</p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>{t("accordion.calculated.normalized")}</li>
                      <li>{t("accordion.calculated.positiveStats")}</li>
                      <li>{t("accordion.calculated.negativeStats")}</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">
                      {t("accordion.calculated.roleWeightingTitle")}
                    </h4>
                    <p className="mt-1">
                      {t("accordion.calculated.roleWeighting")}
                    </p>
                    <p className="text-muted-foreground mt-2 text-xs">
                      {t("accordion.calculated.uniqueWeightings")}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold">
                      {t("accordion.calculated.finalScalingTitle")}
                    </h4>
                    <p className="mt-1">
                      {t("accordion.calculated.finalScaling")}
                    </p>
                    <pre className="bg-muted mt-2 overflow-x-auto rounded-md p-2 font-mono text-xs">
                      2500 + (Z * (1250 / (1 + |Z| / 3)))
                    </pre>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="what-is-good-sr">
              <AccordionTrigger>{t("accordion.goodSr.title")}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-sm">
                  <p>{t("accordion.goodSr.body")}</p>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="how-to-rank">
              <AccordionTrigger>{t("accordion.rank.title")}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-sm">
                  <p>{t("accordion.rank.body")}</p>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="interactive">
              <AccordionTrigger>
                {t("accordion.interactive.title")}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-sm">
                  <p>{t("accordion.interactive.body")}</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      ) : (
        <section className="mt-8">
          <LeaderboardWithStats data={serializedData} role={role} />
        </section>
      )}
    </div>
  );
}

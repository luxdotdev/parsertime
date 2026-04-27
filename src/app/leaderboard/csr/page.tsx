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
import { heroRoleMapping, type HeroName } from "@/types/heroes";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Composite Skill Rating | Parsertime",
  description:
    "Per-hero skill rating derived from Z-scored statistical performance against peers on the same hero.",
};

export default async function CsrLeaderboardPage(props: {
  searchParams: Promise<{ hero?: string }>;
}) {
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

  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b pb-6">
        <div>
          <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
            Leaderboard{currentHero ? ` · ${currentHero}` : null}
          </p>
          <h1 className="mt-3 text-4xl leading-none font-semibold tracking-tight">
            Composite Skill Rating
          </h1>
          <p className="text-muted-foreground mt-2 max-w-prose text-sm">
            Per-hero rating derived from Z-scored statistical performance
            against peers on the same hero. Top 50 per hero, requires 10 maps
            and 60 seconds per map.
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
              Pick a hero
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">
              The leaderboard is per hero
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              Choose a hero above to view the top 50 performers. CSR is
              computed independently per hero so comparisons stay grounded in
              role-relevant stats.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="how-it-works">
              <AccordionTrigger>How is CSR calculated?</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-sm">
                  <p>
                    CSR is a skill rating derived from your statistical
                    performance compared to the average player on a specific
                    hero.
                  </p>
                  <div>
                    <h4 className="font-semibold">The formula</h4>
                    <p className="mt-1">
                      We calculate a Z-score for each key statistic, which
                      measures how many standard deviations you are above or
                      below the average.
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>Stats are normalized to per 10 minutes.</li>
                      <li>
                        Positive stats (Eliminations) reward higher values.
                      </li>
                      <li>
                        Negative stats (Deaths, Damage Taken) reward lower
                        values.
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Role weighting</h4>
                    <p className="mt-1">
                      Each role prioritizes different stats. Tank: low Deaths
                      (30%), Eliminations (20%), Solo Kills (15%). Damage:
                      Eliminations (30%), Final Blows (20%), Damage Dealt
                      (20%). Support: Healing (35%), low Deaths (25%).
                    </p>
                    <p className="text-muted-foreground mt-2 text-xs">
                      Specific heroes like Mercy use unique weightings.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold">Final scaling</h4>
                    <p className="mt-1">
                      Weighted Z-scores are summed and converted to an SR
                      scale centered at 2500.
                    </p>
                    <pre className="bg-muted mt-2 overflow-x-auto rounded-md p-2 font-mono text-xs">
                      2500 + (Z * (1250 / (1 + |Z| / 3)))
                    </pre>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="what-is-good-sr">
              <AccordionTrigger>What is a good SR?</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-sm">
                  <p>
                    Scores follow a bell curve. Average is 2500; one standard
                    deviation above (about 300 to 400 SR) puts you in roughly
                    the top 16%. The further above 2500, the rarer the rating.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="how-to-rank">
              <AccordionTrigger>How do I get on the board?</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-sm">
                  <p>
                    Play at least 10 maps on the hero with at least 60 seconds
                    of playtime per map. Brief mid-map swaps don&apos;t count.
                    The board displays the top 50; ranks below that still show
                    on the player profile.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="interactive">
              <AccordionTrigger>Reading the table</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-sm">
                  <p>
                    Click any row to open a detailed stat panel: SR
                    distribution, role-radar, and per-10 breakdowns.
                    Keyboard-navigable via Tab and Enter.
                  </p>
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

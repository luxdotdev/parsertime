import { HeroSelector } from "@/components/leaderboard/hero-selector";
import { LeaderboardWithStats } from "@/components/leaderboard/leaderboard-with-stats";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getCompositeSRLeaderboard } from "@/lib/hero-rating";
import { heroRoleMapping, type HeroName } from "@/types/heroes";

export default async function LeaderboardPage(props: {
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
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <HeroSelector currentHero={currentHero} />
      </div>

      {!currentHero || !role ? (
        <div className="flex flex-col items-center justify-center space-y-4 py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Hero Leaderboard</h2>
            <p className="text-muted-foreground mt-4 max-w-2xl">
              Select a hero above to view the top players for that hero. The
              leaderboard uses a Composite Skill Rating (CSR) system that
              evaluates performance across multiple statistics compared to the
              average, weighted by their importance for each hero.
            </p>
          </div>

          <div className="mt-8 w-full max-w-2xl">
            <Accordion type="single" collapsible>
              <AccordionItem value="how-it-works">
                <AccordionTrigger>
                  How is Composite SR (CSR) Calculated?
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 text-left">
                    <p>
                      CSR is a skill rating derived from your statistical
                      performance compared to the average player on a specific
                      hero.
                    </p>

                    <div>
                      <h4 className="font-semibold">The Formula</h4>
                      <p className="mt-1">
                        We calculate a <strong>Z-Score</strong> for each key
                        statistic, which measures how many standard deviations
                        you are above or below the average.
                      </p>
                      <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                        <li>
                          Stats are normalized to &quot;per 10 minutes&quot;.
                        </li>
                        <li>
                          Positive stats (e.g., Eliminations) reward higher
                          values.
                        </li>
                        <li>
                          Negative stats (e.g., Deaths, Damage Taken) reward
                          lower values.
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold">Role Weighting</h4>
                      <p className="mt-1">
                        Each role prioritizes different stats. For example:
                      </p>
                      <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                        <li>
                          <strong>Tank:</strong> Prioritizes low Deaths (30%),
                          Eliminations (20%), and Solo Kills (15%).
                        </li>
                        <li>
                          <strong>Damage:</strong> Prioritizes Eliminations
                          (30%), Final Blows (20%), and Damage Dealt (20%).
                        </li>
                        <li>
                          <strong>Support:</strong> Prioritizes Healing (35%)
                          and low Deaths (25%).
                        </li>
                      </ul>
                      <p className="text-muted-foreground mt-2 text-xs">
                        *Specific heroes like Mercy have unique weightings.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold">Final CSR Calculation</h4>
                      <p className="mt-1">
                        The weighted Z-scores are summed and converted to an CSR
                        scale centered at <strong>2500</strong> (average).
                      </p>
                      <pre className="bg-muted mt-2 overflow-x-auto rounded p-2 text-xs">
                        2500 + (Z_Score * (1250 / (1 + |Z_Score| / 3)))
                      </pre>
                      <p className="mt-2">
                        This formula ensures that extreme outliers don&apos;t
                        break the scale, while rewarding consistent high
                        performance.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="what-is-good-sr">
                <AccordionTrigger>What is a good SR?</AccordionTrigger>
                <AccordionContent>
                  <p>
                    <strong>What is a good SR?</strong> In this leaderboard
                    system, player scores (SR) are distributed along a{" "}
                    <span className="font-semibold">bell curve</span>, also
                    known as a <em>normal distribution</em>. This means most
                    players will have scores clustered around the{" "}
                    <strong>average</strong>, and fewer players will have
                    extremely high or low scores.
                  </p>
                  <p className="mt-2">
                    The <strong>average SR</strong> is{" "}
                    <span className="font-semibold">2500</span>, representing
                    the skill level of a typical player. Scores above 2500 are
                    considered{" "}
                    <span className="font-semibold">above average</span>, while
                    those below 2500 are{" "}
                    <span className="font-semibold">below average</span>.
                  </p>
                  <p className="mt-2">
                    The concept of the bell curve ensures that:
                  </p>
                  <ul className="-mt-1 list-disc space-y-1 pl-4">
                    <li>Most players will have SRs close to 2500.</li>
                    <li>
                      A &quot;good&quot; SR is typically anything{" "}
                      <span className="font-semibold">above the average</span>{" "}
                      (2500).
                    </li>
                    <li>
                      The further your SR is above 2500, the rarer and more
                      impressive your ranking.
                    </li>
                  </ul>
                  <p className="mt-4">
                    <strong>Standard deviation</strong> is used to measure how
                    spread out the scores are around the average. If your SR is
                    one standard deviation (<em>about 300-400 SR</em>) above
                    2500, you&apos;re already in roughly the top 16% of players.
                    The higher your SR relative to 2500, the fewer players have
                    achieved that score.
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="how-to-get-on-the-leaderboard">
                <AccordionTrigger>
                  How do I get on the leaderboard?
                </AccordionTrigger>
                <AccordionContent>
                  <p>
                    To get on the leaderboard, you need to have{" "}
                    <strong>at least 10 maps</strong> played on the hero. This
                    ensures that the data is statistically significant.
                  </p>
                  <p className="mt-2">
                    You also need to have played{" "}
                    <strong>at least 60 seconds</strong> on the hero. Switching
                    to a hero mid-game for a few seconds will not count as a
                    map.
                  </p>
                  <p className="mt-2">
                    While the leaderboard shows the top 50 players for each
                    hero, your rank is still calculated and can be shown on your
                    profile page.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      ) : (
        <LeaderboardWithStats data={serializedData} role={role} />
      )}
    </div>
  );
}

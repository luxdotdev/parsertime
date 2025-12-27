import { TeamSelector } from "@/components/stats/team/selector";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function TeamStatsPage() {
  const session = await auth();
  const user = await getUser(session?.user.email);
  if (!user) redirect("/sign-in");

  const teams = await prisma.team.findMany({
    where: {
      users: {
        some: { id: user.id },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Team Stats</h1>
      </div>

      <div className="flex flex-col items-center justify-center space-y-4 py-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Team Statistics</h2>
          <p className="text-muted-foreground mt-4 max-w-2xl text-balance">
            Select a team below to view comprehensive statistics and performance
            metrics for your team. Team stats are calculated by aggregating
            individual player performances and analyzing team-wide trends across
            matches and scrims. Only teams you are a member of will be shown.
          </p>
        </div>

        <div className="mt-8 flex w-full max-w-2xl items-center justify-center">
          <TeamSelector teams={teams} />
        </div>

        <div className="mt-8 w-full max-w-4xl">
          <Accordion type="single" collapsible>
            <AccordionItem value="overview-tab">
              <AccordionTrigger>
                <span className="font-semibold">Overview</span>: What&apos;s
                Your Team&apos;s Overall Performance?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-left">
                  <p>
                    The Overview tab provides a high-level snapshot of your
                    team&apos;s performance and composition.
                  </p>

                  <div>
                    <h4 className="font-semibold">Quick Stats Card</h4>
                    <p className="mt-1">
                      Displays key performance indicators at a glance:
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>
                        <strong>Last 10 Games:</strong> Win rate and record for
                        your most recent matches
                      </li>
                      <li>
                        <strong>Best Day of Week:</strong> Identifies which day
                        your team performs best (requires 3+ games per day)
                      </li>
                      <li>
                        <strong>Average Fight Duration:</strong> Mean length of
                        team fights in seconds
                      </li>
                      <li>
                        <strong>First Pick Success Rate:</strong> Win rate when
                        your team gets the first pick in a fight
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">Team Roster Grid</h4>
                    <p className="mt-1">
                      Visual overview of all team members, showing their roles
                      and basic information.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold">Recent Activity Calendar</h4>
                    <p className="mt-1">
                      Calendar heatmap showing when your team has played scrims
                      and matches, helping identify activity patterns and
                      consistency.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold">Top Maps Card</h4>
                    <p className="mt-1">
                      Shows your top 5 most played maps with win rates, helping
                      identify your team&apos;s comfort zones and frequently
                      played maps.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold">Strengths & Weaknesses</h4>
                    <p className="mt-1">
                      Highlights your best map by win rate and your blind spot
                      map (most played map with lowest win rate), providing
                      actionable insights for practice priorities.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold">Role Balance Radar</h4>
                    <p className="mt-1">
                      Interactive radar chart comparing Tank, Damage, and
                      Support roles across four key metrics:
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>
                        <strong>Eliminations:</strong> K/D ratio normalized
                        across roles
                      </li>
                      <li>
                        <strong>Survivability:</strong> Deaths per minute (lower
                        is better)
                      </li>
                      <li>
                        <strong>Ult Usage:</strong> Ultimate efficiency and
                        timing
                      </li>
                      <li>
                        <strong>Activity:</strong> Total playtime across roles
                      </li>
                    </ul>
                    <p className="mt-2">
                      Includes balance score, strongest/weakest role
                      identification, and actionable insights for improving role
                      balance.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="performance-tab">
              <AccordionTrigger>
                <span className="font-semibold">Performance</span>: Which Roles
                Are Your Strongest?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-left">
                  <p>
                    The Performance tab dives deep into role-specific metrics
                    and team composition effectiveness.
                  </p>

                  <div>
                    <h4 className="font-semibold">Role Performance Card</h4>
                    <p className="mt-1">
                      Detailed statistics for each role (Tank, Damage, Support)
                      including:
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>Win rates and match records per role</li>
                      <li>Per-10-minute normalized statistics</li>
                      <li>K/D ratios and survivability metrics</li>
                      <li>Ultimate efficiency and usage rates</li>
                      <li>Damage, healing, and mitigation statistics</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">Best Role Trios Card</h4>
                    <p className="mt-1">
                      Identifies the most successful 3-player role combinations
                      (e.g., 1 Tank, 2 Damage, 2 Support) with:
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>Win rates for each role trio composition</li>
                      <li>Number of games played with each composition</li>
                      <li>Ranking of most effective trios</li>
                    </ul>
                    <p className="mt-2">
                      Helps identify which role distributions work best for your
                      team.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="heroes-tab">
              <AccordionTrigger>
                <span className="font-semibold">Heroes</span>: What Heroes Does
                Your Team Actually Play?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-left">
                  <p>
                    The Heroes tab provides comprehensive analysis of your
                    team&apos;s hero pool and pick patterns.
                  </p>

                  <div>
                    <h4 className="font-semibold">Timeframe Selection</h4>
                    <p className="mt-1">
                      Filter hero data by multiple timeframes (subject to
                      permissions):
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>Last Week, 2 Weeks, or Month</li>
                      <li>Last 3 or 6 Months</li>
                      <li>Last Year or All Time</li>
                      <li>Custom date range picker</li>
                    </ul>
                    <p className="mt-2">
                      Permissions control access to longer timeframes, allowing
                      teams to unlock extended historical data.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold">Hero Pool Overview Card</h4>
                    <p className="mt-1">
                      Comprehensive analysis of your team&apos;s hero usage:
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>
                        <strong>Hero Diversity:</strong> Number of unique heroes
                        played and diversity score
                      </li>
                      <li>
                        <strong>Most Played Heroes:</strong> Top heroes by
                        playtime with win rates
                      </li>
                      <li>
                        <strong>Hero Win Rates:</strong> Success rates for each
                        hero your team plays
                      </li>
                      <li>
                        <strong>Role Distribution:</strong> Breakdown of hero
                        picks by role
                      </li>
                      <li>
                        <strong>Pool Depth Analysis:</strong> Insights into
                        whether your hero pool is too narrow or well-balanced
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">Hero Pickrate Heatmap</h4>
                    <p className="mt-1">
                      Interactive heatmap visualization showing:
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>
                        Hero pick rates across different maps and game modes
                      </li>
                      <li>Color-coded intensity showing frequency of picks</li>
                      <li>Map-specific hero preferences</li>
                      <li>Patterns in hero selection strategies</li>
                    </ul>
                    <p className="mt-2">
                      Helps identify which heroes your team favors on specific
                      maps and whether you&apos;re adapting compositions
                      effectively.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="trends-tab">
              <AccordionTrigger>
                <span className="font-semibold">Trends</span>: Is Your Team
                Getting Better?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-left">
                  <p>
                    The Trends tab tracks your team&apos;s performance over time
                    and identifies patterns.
                  </p>

                  <div>
                    <h4 className="font-semibold">Winrate Over Time Chart</h4>
                    <p className="mt-1">Dual-timeline visualization showing:</p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>
                        <strong>Weekly Trends:</strong> Win rate changes week by
                        week
                      </li>
                      <li>
                        <strong>Monthly Trends:</strong> Longer-term performance
                        patterns
                      </li>
                      <li>Trend lines indicating improvement or decline</li>
                      <li>Game counts per time period</li>
                    </ul>
                    <p className="mt-2">
                      Helps identify if your team is improving, declining, or
                      maintaining consistent performance.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold">Recent Form Card</h4>
                    <p className="mt-1">
                      Analysis of your team&apos;s most recent performance:
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>Win rate in recent games</li>
                      <li>
                        Performance trajectory (improving/declining/stable)
                      </li>
                      <li>Comparison to overall win rate</li>
                      <li>Form rating and insights</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">Win/Loss Streaks Card</h4>
                    <p className="mt-1">Tracks consecutive wins and losses:</p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>Current win or loss streak</li>
                      <li>Longest win streak achieved</li>
                      <li>Longest loss streak experienced</li>
                      <li>Streak patterns and frequency</li>
                    </ul>
                    <p className="mt-2">
                      Helps identify momentum patterns and consistency in
                      performance.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="maps-tab">
              <AccordionTrigger>
                <span className="font-semibold">Maps</span>: Which Maps Are Your
                Best and Worst?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-left">
                  <p>
                    The Maps tab provides detailed analysis of your team&apos;s
                    performance across different maps and game modes.
                  </p>

                  <div>
                    <h4 className="font-semibold">Map Mode Performance Card</h4>
                    <p className="mt-1">
                      Breakdown of performance by game mode:
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>
                        <strong>Control:</strong> Win rates and performance on
                        control point maps
                      </li>
                      <li>
                        <strong>Escort:</strong> Performance on payload escort
                        maps
                      </li>
                      <li>
                        <strong>Hybrid:</strong> Combined control and escort
                        maps
                      </li>
                      <li>
                        <strong>Push:</strong> Robot push map performance
                      </li>
                      <li>
                        <strong>Flashpoint:</strong> Control point cluster maps
                      </li>
                    </ul>
                    <p className="mt-2">
                      Helps identify which game modes your team excels at or
                      struggles with.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold">Map Winrate Gallery</h4>
                    <p className="mt-1">
                      Visual gallery showing all maps with:
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>Win rate for each individual map</li>
                      <li>Total playtime on each map</li>
                      <li>Color-coded performance indicators</li>
                      <li>Quick visual comparison across all maps</li>
                    </ul>
                    <p className="mt-2">
                      Makes it easy to spot your strongest and weakest maps at a
                      glance.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold">
                      Player Map Performance Card
                    </h4>
                    <p className="mt-1">
                      Matrix showing individual player performance across
                      different maps:
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>Win rates for each player on each map</li>
                      <li>Performance heatmap by player and map</li>
                      <li>Identification of map specialists</li>
                      <li>Team composition planning insights</li>
                    </ul>
                    <p className="mt-2">
                      Helps optimize lineups by identifying which players
                      perform best on specific maps.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="teamfights-tab">
              <AccordionTrigger>
                <span className="font-semibold">Teamfights</span>: How Do You
                Win Team Fights?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-left">
                  <p>
                    The Teamfights tab provides deep analysis of team fight
                    performance, ultimate economy, and fight outcomes.
                  </p>

                  <div>
                    <h4 className="font-semibold">Team Fight Stats Card</h4>
                    <p className="mt-1">Comprehensive team fight metrics:</p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>
                        <strong>Overall Fight Winrate:</strong> Percentage of
                        team fights won
                      </li>
                      <li>
                        <strong>First Pick Winrate:</strong> Win rate when your
                        team gets the first elimination
                      </li>
                      <li>
                        <strong>First Death Winrate:</strong> Win rate when your
                        team loses a player first
                      </li>
                      <li>
                        <strong>First Ultimate Winrate:</strong> Win rate when
                        your team uses the first ultimate
                      </li>
                      <li>
                        <strong>Dry Fights:</strong> Percentage of fights with
                        no ultimates used and win rate in those fights
                      </li>
                      <li>
                        <strong>Average Ultimates Per Fight:</strong> Mean
                        number of ultimates used in non-dry fights
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">Ultimate Economy Card</h4>
                    <p className="mt-1">
                      Analysis of ultimate usage and efficiency:
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>Ultimate usage rates by role</li>
                      <li>Ultimate economy efficiency</li>
                      <li>Coordination and timing metrics</li>
                      <li>Comparison of ultimate advantage scenarios</li>
                    </ul>
                    <p className="mt-2">
                      Helps identify if your team is maximizing ultimate value
                      and coordinating ultimates effectively.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold">Win Probability Insights</h4>
                    <p className="mt-1">
                      Statistical analysis of fight outcomes:
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>
                        Win probability based on fight conditions (first pick,
                        ultimate advantage, etc.)
                      </li>
                      <li>Expected vs. actual win rates</li>
                      <li>Fight outcome predictions</li>
                      <li>Key factors influencing fight success</li>
                    </ul>
                    <p className="mt-2">
                      Provides data-driven insights into what conditions lead to
                      successful team fights.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="how-to-use">
              <AccordionTrigger>
                <span className="font-semibold">How to Use</span>: How Can I
                Turn This Data Into Wins?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-left">
                  <p>
                    Team stats are designed to help you make data-driven
                    decisions about practice priorities, composition choices,
                    and strategic improvements.
                  </p>

                  <div>
                    <h4 className="font-semibold">Getting Started</h4>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>
                        Start with the Overview tab to get a high-level
                        understanding of your team&apos;s performance
                      </li>
                      <li>
                        Review Quick Stats to identify immediate strengths and
                        weaknesses
                      </li>
                      <li>
                        Check the Role Balance Radar to see if any roles need
                        more attention
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">Practice Planning</h4>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>
                        Use the Maps tab to identify maps that need more
                        practice (low win rates with high playtime)
                      </li>
                      <li>
                        Review Player Map Performance to optimize lineups for
                        specific maps
                      </li>
                      <li>
                        Check Map Mode Performance to focus practice on weaker
                        game modes
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">Composition Strategy</h4>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>
                        Review Best Role Trios to understand which role
                        distributions work best
                      </li>
                      <li>
                        Use the Heroes tab to identify if your hero pool is too
                        narrow or needs expansion
                      </li>
                      <li>
                        Check Hero Pickrate Heatmap to see if you&apos;re
                        adapting compositions effectively across maps
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">Team Fight Improvement</h4>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>
                        Review Team Fight Stats to identify fight win conditions
                        (first pick, ultimate advantage, etc.)
                      </li>
                      <li>
                        Use Ultimate Economy insights to improve ultimate
                        coordination
                      </li>
                      <li>
                        Check Win Probability Insights to understand what
                        factors most influence fight success
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">Tracking Progress</h4>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>
                        Use the Trends tab to monitor improvement over time
                      </li>
                      <li>
                        Review Recent Form to see if recent changes are having
                        positive effects
                      </li>
                      <li>
                        Track Win/Loss Streaks to identify consistency patterns
                      </li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
}

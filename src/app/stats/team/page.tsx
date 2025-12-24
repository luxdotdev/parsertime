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

        <div className="mt-8 w-full max-w-2xl">
          <Accordion type="single" collapsible>
            <AccordionItem value="how-team-stats-work">
              <AccordionTrigger>
                How are Team Stats Calculated?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-left">
                  <p>
                    Team statistics are derived from aggregating individual
                    player performances across all matches and scrims played by
                    team members.
                  </p>

                  <div>
                    <h4 className="font-semibold">Data Aggregation</h4>
                    <p className="mt-1">
                      Team stats combine performance metrics from all players on
                      the team, including:
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>Individual player statistics per match</li>
                      <li>Team-wide performance trends</li>
                      <li>Match outcomes and win rates</li>
                      <li>Role-specific performance metrics</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">Statistical Analysis</h4>
                    <p className="mt-1">
                      The system analyzes various aspects of team performance:
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>
                        <strong>Average Performance:</strong> Mean statistics
                        across all team members
                      </li>
                      <li>
                        <strong>Consistency Metrics:</strong> Variance and
                        standard deviation of key stats
                      </li>
                      <li>
                        <strong>Trend Analysis:</strong> Performance changes
                        over time
                      </li>
                      <li>
                        <strong>Role Composition:</strong> Impact of different
                        role combinations
                      </li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="what-metrics-are-shown">
              <AccordionTrigger>
                What Metrics are Shown in Team Stats?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-left">
                  <p>
                    Team stats provide a comprehensive view of your team&apos;s
                    performance across multiple dimensions.
                  </p>

                  <div>
                    <h4 className="font-semibold">Overview Metrics</h4>
                    <p className="mt-1">
                      High-level team performance indicators:
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>Win rate and match outcomes</li>
                      <li>Total matches and scrims played</li>
                      <li>Average team composition</li>
                      <li>Performance trends over time</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">Detailed Statistics</h4>
                    <p className="mt-1">
                      Per-10-minute normalized statistics aggregated across the
                      team:
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>Eliminations, Final Blows, Solo Kills</li>
                      <li>Deaths and Damage Dealt/Taken</li>
                      <li>Healing and Damage Blocked</li>
                      <li>Ultimate usage and efficiency</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">Team Composition Analysis</h4>
                    <p className="mt-1">
                      Insights into how different team compositions perform:
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>Most successful hero combinations</li>
                      <li>Role distribution effectiveness</li>
                      <li>Map-specific composition performance</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="how-to-improve-team-stats">
              <AccordionTrigger>
                How Can We Improve Our Team Stats?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-left">
                  <p>
                    Understanding your team stats can help identify areas for
                    improvement and track progress over time.
                  </p>

                  <div>
                    <h4 className="font-semibold">Focus Areas</h4>
                    <p className="mt-1">Review your team stats to identify:</p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>
                        <strong>Consistency:</strong> Areas with high variance
                        that need more practice
                      </li>
                      <li>
                        <strong>Role Balance:</strong> Ensuring all roles are
                        performing optimally
                      </li>
                      <li>
                        <strong>Composition Synergy:</strong> Finding hero
                        combinations that work well together
                      </li>
                      <li>
                        <strong>Trend Analysis:</strong> Tracking improvement or
                        decline over time
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold">Using the Data</h4>
                    <p className="mt-1">
                      Leverage team stats to make informed decisions:
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                      <li>Identify which maps need more practice</li>
                      <li>Understand which compositions work best</li>
                      <li>Track individual player contributions</li>
                      <li>Set goals and measure progress</li>
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

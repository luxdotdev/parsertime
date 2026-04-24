import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isTeamOwnerOrManager } from "@/lib/auth";
import { weekEndInTz, weekStartInTz } from "@/lib/availability/tz";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ teamId: string }> };

export default async function AvailabilityIndexPage({ params }: PageProps) {
  const { teamId: raw } = await params;
  const teamId = parseInt(raw);
  if (!Number.isFinite(teamId)) notFound();

  const canManage = await isTeamOwnerOrManager(teamId);

  const [team, settings, schedules] = await Promise.all([
    prisma.team.findUnique({ where: { id: teamId }, select: { name: true } }),
    prisma.teamAvailabilitySettings.findUnique({ where: { teamId } }),
    prisma.availabilitySchedule.findMany({
      where: { teamId },
      orderBy: { weekStart: "desc" },
      take: 20,
      select: {
        id: true,
        weekStart: true,
        weekEnd: true,
        _count: { select: { responses: true } },
      },
    }),
  ]);

  if (!team) notFound();

  const tz = settings?.timezone ?? "America/New_York";
  const now = new Date();
  const currentWeekStart = weekStartInTz(now, tz);
  const currentWeekEnd = weekEndInTz(currentWeekStart, tz);

  const currentSchedule = schedules.find(
    (s) => s.weekStart.getTime() === currentWeekStart.getTime()
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{team.name} — Availability</h1>
        {canManage && (
          <Link href={`/team/${teamId}/availability/settings` as never}>
            <Button variant="outline">Settings</Button>
          </Link>
        )}
      </div>

      {!settings && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">
              Availability is not configured for this team yet.{" "}
              {canManage ? (
                <Link
                  href={`/team/${teamId}/availability/settings` as never}
                  className="underline"
                >
                  Set it up
                </Link>
              ) : (
                "Ask an owner or manager to configure it."
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {settings && (
        <Card>
          <CardHeader>
            <CardTitle>
              Current week: {currentWeekStart.toLocaleDateString()} –{" "}
              {currentWeekEnd.toLocaleDateString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentSchedule ? (
              <>
                <p className="text-muted-foreground text-sm">
                  {currentSchedule._count.responses} response
                  {currentSchedule._count.responses === 1 ? "" : "s"} so far.
                </p>
                <div className="flex gap-2">
                  <Link
                    href={
                      `/team/${teamId}/availability/${currentSchedule.id}` as never
                    }
                  >
                    <Button>Open share link</Button>
                  </Link>
                </div>
              </>
            ) : (
              canManage && <StartCurrentWeekForm teamId={teamId} />
            )}
          </CardContent>
        </Card>
      )}

      {schedules.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Past weeks</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {schedules
                .filter((s) => s.id !== currentSchedule?.id)
                .map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="text-sm">
                      {s.weekStart.toLocaleDateString()} –{" "}
                      {s.weekEnd.toLocaleDateString()}{" "}
                      <span className="text-muted-foreground">
                        ({s._count.responses} responses)
                      </span>
                    </span>
                    <Link
                      href={`/team/${teamId}/availability/${s.id}` as never}
                      className="text-sm underline"
                    >
                      View
                    </Link>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

async function startCurrentWeek(teamId: number) {
  "use server";
  if (!(await isTeamOwnerOrManager(teamId))) {
    throw new Error("Unauthorized");
  }
  const settings = await prisma.teamAvailabilitySettings.upsert({
    where: { teamId },
    create: { teamId },
    update: {},
  });
  const now = new Date();
  const weekStart = weekStartInTz(now, settings.timezone);
  const weekEnd = weekEndInTz(weekStart, settings.timezone);
  await prisma.availabilitySchedule.upsert({
    where: { teamId_weekStart: { teamId, weekStart } },
    create: { teamId, weekStart, weekEnd },
    update: {},
  });
  revalidatePath(`/team/${teamId}/availability`);
}

function StartCurrentWeekForm({ teamId }: { teamId: number }) {
  return (
    <form action={startCurrentWeek.bind(null, teamId)}>
      <Button type="submit">Start this week</Button>
    </form>
  );
}

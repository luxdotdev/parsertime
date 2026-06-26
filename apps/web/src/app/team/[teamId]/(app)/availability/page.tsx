import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isTeamOwnerOrManager } from "@/lib/auth";
import { weekEndInTz, weekStartInTz } from "@/lib/availability/tz";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import type { Metadata } from "next";

type PageProps = { params: Promise<{ teamId: string }> };

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("availability.metadata");
  return { title: t("title"), description: t("description") };
}

export default async function AvailabilityIndexPage({ params }: PageProps) {
  const { teamId: raw } = await params;
  const teamId = parseInt(raw);
  if (!Number.isFinite(teamId)) notFound();
  const t = await getTranslations("availability.indexPage");
  const format = await getFormatter();

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
  const currentWeekStart = weekStartInTz(
    now,
    tz,
    settings?.reminderDayOfWeek ?? 0
  );
  const currentWeekEnd = weekEndInTz(currentWeekStart, tz);

  const currentSchedule = schedules.find(
    (s) => s.weekStart.getTime() === currentWeekStart.getTime()
  );
  function formatDate(date: Date) {
    return format.dateTime(date, {
      dateStyle: "medium",
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {t("title", { teamName: team.name })}
        </h1>
        {canManage && (
          <Link href={`/team/${teamId}/availability/settings` as never}>
            <Button variant="outline">{t("settings")}</Button>
          </Link>
        )}
      </div>

      {!settings && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">
              {canManage
                ? t.rich("notConfiguredManager", {
                    setup: (chunks) => (
                      <Link
                        href={`/team/${teamId}/availability/settings` as never}
                        className="underline"
                      >
                        {chunks}
                      </Link>
                    ),
                  })
                : t("notConfiguredViewer")}
            </p>
          </CardContent>
        </Card>
      )}

      {settings && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t("currentWeek", {
                start: formatDate(currentWeekStart),
                end: formatDate(currentWeekEnd),
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentSchedule ? (
              <>
                <p className="text-muted-foreground text-sm">
                  {t("responsesSoFar", {
                    count: currentSchedule._count.responses,
                  })}
                </p>
                <div className="flex gap-2">
                  <Link
                    href={
                      `/team/${teamId}/availability/${currentSchedule.id}` as never
                    }
                  >
                    <Button>{t("openShareLink")}</Button>
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
            <CardTitle>{t("pastWeeks")}</CardTitle>
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
                      {t("pastWeekRange", {
                        start: formatDate(s.weekStart),
                        end: formatDate(s.weekEnd),
                      })}{" "}
                      <span className="text-muted-foreground">
                        {t("pastWeekResponses", {
                          count: s._count.responses,
                        })}
                      </span>
                    </span>
                    <Link
                      href={`/team/${teamId}/availability/${s.id}` as never}
                      className="text-sm underline"
                    >
                      {t("view")}
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
  const weekStart = weekStartInTz(
    now,
    settings.timezone,
    settings.reminderDayOfWeek
  );
  const weekEnd = weekEndInTz(weekStart, settings.timezone);
  await prisma.availabilitySchedule.upsert({
    where: { teamId_weekStart: { teamId, weekStart } },
    create: { teamId, weekStart, weekEnd },
    update: {},
  });
  revalidatePath(`/team/${teamId}/availability`);
}

async function StartCurrentWeekForm({ teamId }: { teamId: number }) {
  const t = await getTranslations("availability.indexPage");

  return (
    <form action={startCurrentWeek.bind(null, teamId)}>
      <Button type="submit">{t("startThisWeek")}</Button>
    </form>
  );
}

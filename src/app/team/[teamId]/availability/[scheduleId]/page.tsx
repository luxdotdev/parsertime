import { AvailabilityFillView } from "@/components/availability/availability-fill-view";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ teamId: string; scheduleId: string }>;
};

export default async function PublicFillPage({ params }: PageProps) {
  const { teamId: raw, scheduleId } = await params;
  const teamId = parseInt(raw);
  if (!Number.isFinite(teamId)) notFound();

  const schedule = await prisma.availabilitySchedule.findUnique({
    where: { id: scheduleId },
    include: {
      team: {
        select: { id: true, name: true, availabilitySettings: true },
      },
      responses: {
        select: {
          id: true,
          displayName: true,
          slots: true,
          updatedAt: true,
          userId: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (
    !schedule ||
    schedule.team.id !== teamId ||
    !schedule.team.availabilitySettings
  ) {
    notFound();
  }

  const session = await auth();
  const sessionUser = session?.user?.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true },
      })
    : null;

  const prefillName = sessionUser?.name ?? null;

  return (
    <AvailabilityFillView
      scheduleId={schedule.id}
      teamName={schedule.team.name}
      weekStart={schedule.weekStart.toISOString()}
      weekEnd={schedule.weekEnd.toISOString()}
      settings={{
        slotMinutes: schedule.team.availabilitySettings.slotMinutes,
        hoursStart: schedule.team.availabilitySettings.hoursStart,
        hoursEnd: schedule.team.availabilitySettings.hoursEnd,
        timezone: schedule.team.availabilitySettings.timezone,
      }}
      initialResponses={schedule.responses.map((r) => ({
        id: r.id,
        displayName: r.displayName,
        slots: r.slots,
        updatedAt: r.updatedAt.toISOString(),
      }))}
      prefillName={prefillName}
      sessionUserLoggedIn={Boolean(sessionUser)}
    />
  );
}

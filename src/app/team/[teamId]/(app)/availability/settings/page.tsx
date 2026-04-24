import { AvailabilitySettingsForm } from "@/components/availability/availability-settings-form";
import { isTeamOwnerOrManager } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

type PageProps = { params: Promise<{ teamId: string }> };

export default async function AvailabilitySettingsPage({ params }: PageProps) {
  const { teamId: raw } = await params;
  const teamId = parseInt(raw);
  if (!Number.isFinite(teamId)) notFound();

  if (!(await isTeamOwnerOrManager(teamId))) {
    redirect(`/team/${teamId}/availability`);
  }

  const existing = await prisma.teamAvailabilitySettings.findUnique({
    where: { teamId },
  });

  const initial = {
    slotMinutes: (existing?.slotMinutes ?? 30) as 15 | 30 | 60,
    hoursStart: existing?.hoursStart ?? 12,
    hoursEnd: existing?.hoursEnd ?? 24,
    timezone: existing?.timezone ?? "America/New_York",
    reminderEnabled: existing?.reminderEnabled ?? true,
    reminderDayOfWeek: existing?.reminderDayOfWeek ?? 0,
    reminderHour: existing?.reminderHour ?? 12,
    reminderMinute: existing?.reminderMinute ?? 0,
    reminderRoleId: existing?.reminderRoleId ?? "",
    reminderGuildId: existing?.reminderGuildId ?? "",
    reminderChannelId: existing?.reminderChannelId ?? "",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Availability settings</h1>
        <p className="text-muted-foreground text-sm">
          Configure how the shared availability calendar works for your team.
        </p>
      </div>
      <AvailabilitySettingsForm teamId={teamId} initial={initial} />
    </div>
  );
}

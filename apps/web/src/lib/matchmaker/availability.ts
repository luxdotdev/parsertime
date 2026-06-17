import prisma from "@/lib/prisma";

export type TeamAvailabilityWeek = {
  slotMinutes: number;
  responses: number[][]; // each entry is one member's slot list
} | null;

const REQUIRED_RESPONDERS_PER_SLOT = 3;

export function computeAvailabilityOverlapHours(input: {
  a: TeamAvailabilityWeek;
  b: TeamAvailabilityWeek;
}): number {
  if (!input.a || !input.b) return 0;
  const aHours = hoursWithCoverage(input.a);
  const bHours = hoursWithCoverage(input.b);
  let overlap = 0;
  for (const h of aHours) if (bHours.has(h)) overlap += 1;
  return overlap;
}

function hoursWithCoverage(
  team: NonNullable<TeamAvailabilityWeek>
): Set<number> {
  const slotsPerHour = 60 / team.slotMinutes;
  const counts = new Map<number, number>();
  for (const r of team.responses) {
    for (const s of r) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  const covered = new Set<number>();
  for (const [slot, n] of counts) {
    if (n >= REQUIRED_RESPONDERS_PER_SLOT) covered.add(slot);
  }
  const result = new Set<number>();
  const seenHours = new Set<number>();
  for (const slot of covered) {
    const hour = Math.floor(slot / slotsPerHour);
    if (seenHours.has(hour)) continue;
    seenHours.add(hour);
    let allCovered = true;
    for (let i = 0; i < slotsPerHour; i++) {
      if (!covered.has(hour * slotsPerHour + i)) {
        allCovered = false;
        break;
      }
    }
    if (allCovered) result.add(hour);
  }
  return result;
}

export async function loadCurrentTeamAvailability(
  teamId: number
): Promise<TeamAvailabilityWeek> {
  const settings = await prisma.teamAvailabilitySettings.findUnique({
    where: { teamId },
    select: { slotMinutes: true },
  });
  if (!settings) return null;
  const schedule = await prisma.availabilitySchedule.findFirst({
    where: {
      teamId,
      weekStart: { lte: new Date() },
      weekEnd: { gt: new Date() },
    },
    include: { responses: { select: { slots: true } } },
    orderBy: { weekStart: "desc" },
  });
  if (!schedule || schedule.responses.length === 0) return null;
  return {
    slotMinutes: settings.slotMinutes,
    responses: schedule.responses.map((r) => r.slots),
  };
}

export type TrackedOrganizer = {
  id: string;
  label: string;
  notes: string;
};

export const TRACKED_ORGANIZERS: TrackedOrganizer[] = [
  {
    id: "faceit_ow2",
    label: "FACEIT OW2 Cups",
    notes: "Overdrive Cup, WASB Cup, FACEIT-run amateur cups",
  },
  {
    id: "abd401de-e6ec-4ef1-8d4b-3d820f8f62ce",
    label: "OWCS 2024 + OWWC",
    notes:
      "OWCS 2024 NA + EMEA Stage 1-4, Dreamhack Dallas, OWWC Conference Cups",
  },
  {
    id: "f0e8a591-08fd-4619-9d59-d97f0571842e",
    label: "FACEIT League / OWCS Central",
    notes:
      "FACEIT League S1-S8 (Master/Expert/Advanced/Open Central) + OWCS Central S4-S8 + OWCS 2025/2026 OQs + EWC Master qualifiers + LCQ. Hosts essentially all current high-tier NA play.",
  },
  {
    id: "37d7c27f-ddb7-4c2c-91d5-771cfe3376cd",
    label: "Calling All Heroes",
    notes: "CAH Spring Season, Raidiant CAH Academy events",
  },
];

export const TRACKED_ORGANIZER_IDS = new Set(
  TRACKED_ORGANIZERS.map((o) => o.id)
);

export function isTrackedOrganizer(
  organizerId: string | null | undefined
): boolean {
  return !!organizerId && TRACKED_ORGANIZER_IDS.has(organizerId);
}

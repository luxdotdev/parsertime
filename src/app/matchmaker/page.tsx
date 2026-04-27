import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  MatchmakerHub,
  type HubTeam,
} from "@/components/matchmaker/matchmaker-hub";
import { getTierBucket } from "@/lib/tsr/tier-bucket";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Matchmaker | Parsertime",
  description:
    "Find a scrim partner whose roster sits at a comparable TSR — built on the same skill rating you see on the team page.",
};

export default async function MatchmakerHubPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      teams: {
        where: { readonly: false },
        select: {
          id: true,
          name: true,
          teamTsrSnapshot: {
            select: {
              rating: true,
              region: true,
              bracketTier: true,
              bracketBand: true,
            },
          },
        },
        orderBy: { name: "asc" },
      },
    },
  });

  const hubTeams: HubTeam[] = (user?.teams ?? []).map((t) => {
    const snap = t.teamTsrSnapshot;
    if (!snap) {
      return {
        id: t.id,
        name: t.name,
        hasSnapshot: false,
        bracketLabel: null,
        region: null,
        rating: null,
        bracketTier: null,
      };
    }
    const bucket = getTierBucket(snap.rating);
    return {
      id: t.id,
      name: t.name,
      hasSnapshot: true,
      bracketLabel: bucket.label,
      region: snap.region,
      rating: snap.rating,
      bracketTier: snap.bracketTier,
    };
  });

  return <MatchmakerHub teams={hubTeams} />;
}

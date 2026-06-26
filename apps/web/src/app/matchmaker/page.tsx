import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  MatchmakerHub,
  type HubTeam,
} from "@/components/matchmaker/matchmaker-hub";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import { getTierBucket } from "@/lib/tsr/tier-bucket";
import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("matchmaker.metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

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
        bracketBand: null,
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
      bracketBand: bucket.band,
      region: snap.region,
      rating: snap.rating,
      bracketTier: snap.bracketTier,
    };
  });

  return <MatchmakerHub teams={hubTeams} />;
}

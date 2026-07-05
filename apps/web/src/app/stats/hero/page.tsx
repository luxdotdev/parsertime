import { StatPanel } from "@/components/player/stat-panel";
import { Link } from "@/components/ui/link";
import { Skeleton } from "@/components/ui/skeleton";
import { defaultLocale } from "@/i18n/config";
import {
  getMetadataTranslations,
  getStaticTranslations,
} from "@/lib/metadata-i18n";
import { getHeroNames, toHero } from "@/lib/utils";
import { type HeroName, roleHeroMapping } from "@/types/heroes";
import type { Metadata, Route } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Suspense } from "react";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("statsPage.heroStatsMetadata");
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: "/",
      type: "website",
      siteName: "Sightline",
      images: [
        {
          url: `/api/og?title=${t("ogImage")}`,
          width: 1200,
          height: 630,
        },
      ],
      locale: defaultLocale,
    },
  };
}

// Static shell: the frame and heading prerender (default-locale text via the
// cookie-free translator); the locale-aware roster streams into ONE boundary
// whose fallback mirrors the three role panels.
export default function HeroSelect() {
  const t = getStaticTranslations("statsPage.heroStats");

  return (
    <div className="flex-1 px-6 pt-6 pb-12 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("pickerTitle")}
        </h1>
        <p className="text-muted-foreground mt-1 max-w-prose text-sm">
          {t("description")}
        </p>
      </div>

      <Suspense fallback={<HeroRosterSkeleton />}>
        <HeroRosterContent />
      </Suspense>
    </div>
  );
}

async function HeroRosterContent() {
  const t = await getTranslations("statsPage.heroStats");
  const heroNames = await getHeroNames();

  const groups: { id: string; title: string; heroes: HeroName[] }[] = [
    { id: "tank-roster", title: t("tank"), heroes: roleHeroMapping.Tank },
    { id: "damage-roster", title: t("damage"), heroes: roleHeroMapping.Damage },
    {
      id: "support-roster",
      title: t("support"),
      heroes: roleHeroMapping.Support,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {groups.map((group) => (
        <section
          key={group.id}
          aria-labelledby={group.id}
          className="flex flex-col gap-3"
        >
          <h2
            id={group.id}
            className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.08em] uppercase"
          >
            {group.title}
          </h2>
          <StatPanel className="flex-1">
            <div className="bg-border grid grid-cols-3 gap-px sm:grid-cols-4 md:grid-cols-3">
              {group.heroes.map((hero) => {
                const heroLabel = heroNames.get(toHero(hero)) ?? hero;
                return (
                  <Link
                    key={hero}
                    href={`/stats/hero/${hero}` as Route}
                    className="bg-card [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/40 flex flex-col items-center gap-2 px-3 py-4 text-center no-underline transition-colors"
                  >
                    <Image
                      src={`/heroes/${toHero(hero)}.png`}
                      alt={t("altText", { hero: heroLabel })}
                      width={128}
                      height={128}
                      className="ring-foreground/10 size-14 rounded-md object-cover ring-1"
                    />
                    <span className="truncate text-xs font-medium">
                      {heroLabel}
                    </span>
                  </Link>
                );
              })}
            </div>
          </StatPanel>
        </section>
      ))}
    </div>
  );
}

// Mirrors the roster's pending layout: three role panels with one skeleton
// cell per hero, so the streamed content replaces it in place with no jump.
function HeroRosterSkeleton() {
  const roles = [
    { id: "tank-roster", heroes: roleHeroMapping.Tank },
    { id: "damage-roster", heroes: roleHeroMapping.Damage },
    { id: "support-roster", heroes: roleHeroMapping.Support },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {roles.map((role) => (
        <section key={role.id} className="flex flex-col gap-3">
          <Skeleton className="h-3 w-14" />
          <StatPanel className="flex-1">
            <div className="bg-border grid grid-cols-3 gap-px sm:grid-cols-4 md:grid-cols-3">
              {role.heroes.map((hero) => (
                <div
                  key={hero}
                  className="bg-card flex flex-col items-center gap-2 px-3 py-4"
                >
                  <Skeleton className="size-14 rounded-md" />
                  <Skeleton className="h-3 w-10" />
                </div>
              ))}
            </div>
          </StatPanel>
        </section>
      ))}
    </div>
  );
}

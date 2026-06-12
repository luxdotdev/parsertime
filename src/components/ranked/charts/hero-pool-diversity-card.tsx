"use client";

import { useTranslations } from "next-intl";
import { SectionHeader } from "@/components/stats/team/section-header";
import type { HeroPoolDiversityResult } from "@/lib/ranked-stats";

type HeroPoolDiversityCardProps = {
  result: HeroPoolDiversityResult;
};

type DiversityTranslator = ReturnType<
  typeof useTranslations<"ranked.charts.heroPoolDiversity">
>;

function buildDescription(
  result: HeroPoolDiversityResult,
  t: DiversityTranslator
): string {
  if (result.totalUnique === 0) return t("descriptionNoMatches");

  const rolesWithHeroes = result.byRole.filter((r) => r.count > 0);
  if (rolesWithHeroes.length === 0) return t("descriptionNoHeroData");

  if (rolesWithHeroes.length === 3) {
    return t("descriptionAllRoles", { count: result.totalUnique });
  }

  const dominant = result.byRole.reduce((a, b) => (a.count > b.count ? a : b));
  return t("descriptionConcentrated", {
    role: dominant.role,
    count: result.totalUnique,
  });
}

export function HeroPoolDiversityCard({ result }: HeroPoolDiversityCardProps) {
  const t = useTranslations("ranked.charts.heroPoolDiversity");
  const { totalUnique, byRole, heroList } = result;
  const hasData = totalUnique > 0;
  const description = buildDescription(result, t);

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={description}
        rightSlot={
          hasData ? (
            <div
              className="flex flex-col items-center"
              aria-label={t("uniqueHeroesAriaLabel", { count: totalUnique })}
            >
              <span className="text-4xl font-bold tabular-nums leading-none">
                {totalUnique}
              </span>
              <span className="text-muted-foreground text-xs mt-1">
                {t("heroUnit", { count: totalUnique })}
              </span>
            </div>
          ) : undefined
        }
      />
      {hasData ? (
          <div className="flex flex-col gap-4" role="list" aria-label={t("heroesByRoleAriaLabel")}>
            {byRole.map((roleEntry) => {
              const roleHeroes = heroList.filter((h) => h.role === roleEntry.role);
              return (
                <div key={roleEntry.role} className="flex flex-col gap-1.5" role="listitem">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: roleEntry.fill }}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium">{roleEntry.role}</span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {t("heroesLabel", { count: roleEntry.count })}
                    </span>
                  </div>
                  {roleHeroes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pl-4" aria-label={t("roleHeroesAriaLabel", { role: roleEntry.role })}>
                      {roleHeroes.map(({ hero }) => (
                        <span
                          key={hero}
                          className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium"
                          title={hero}
                        >
                          {hero}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="pl-4 text-muted-foreground text-xs">
                      {t("noRoleHeroes", { role: roleEntry.role })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
      ) : (
        <div className="flex h-[200px] items-center justify-center">
          <p className="text-muted-foreground text-sm">{t("noData")}</p>
        </div>
      )}
    </section>
  );
}

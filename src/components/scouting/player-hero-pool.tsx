"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HeroFrequency } from "@/data/player-scouting-dto";
import { cn, toHero } from "@/lib/utils";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

type PlayerHeroPoolProps = {
  signatureHeroes: string[];
  heroFrequencies: HeroFrequency[];
};

export function PlayerHeroPool({
  signatureHeroes,
  heroFrequencies,
}: PlayerHeroPoolProps) {
  const t = useTranslations("scoutingPage.player.profile");

  const maxMapCount = heroFrequencies[0]?.mapCount ?? 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("heroPool")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {signatureHeroes.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-sm font-semibold">{t("knownFor")}</h3>
              <Badge variant="outline" className="text-[10px]">
                {t("knownForSource")}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-3">
              {signatureHeroes.map((hero) => (
                <div
                  key={hero}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2"
                >
                  <Image
                    src={`/heroes/${toHero(hero)}.png`}
                    alt={hero}
                    width={28}
                    height={28}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">{hero}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h3 className="mb-3 text-sm font-semibold">
            {t("observedInCompetition")}
          </h3>
          {heroFrequencies.length > 0 ? (
            <div className="space-y-2">
              {heroFrequencies.slice(0, 10).map((hf, index) => (
                <HeroFrequencyBar
                  key={hf.hero}
                  hero={hf.hero}
                  mapCount={hf.mapCount}
                  maxMapCount={maxMapCount}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center">
              <Info
                className="text-muted-foreground h-6 w-6"
                aria-hidden="true"
              />
              <p className="text-muted-foreground text-sm">{t("noHeroData")}</p>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function HeroFrequencyBar({
  hero,
  mapCount,
  maxMapCount,
  index,
}: {
  hero: string;
  mapCount: number;
  maxMapCount: number;
  index: number;
}) {
  const t = useTranslations("scoutingPage.player.profile");
  const normalizedWidth = Math.max((mapCount / maxMapCount) * 100, 4);

  return (
    <div
      className={cn(
        "flex items-center gap-3",
        "animate-in fade-in slide-in-from-bottom-2"
      )}
      style={{
        animationDelay: `${index * 50}ms`,
        animationFillMode: "backwards",
        animationDuration: "300ms",
      }}
    >
      <div className="flex w-28 shrink-0 items-center gap-2">
        <Image
          src={`/heroes/${toHero(hero)}.png`}
          alt={hero}
          width={24}
          height={24}
          className="rounded"
        />
        <span className="truncate text-sm">{hero}</span>
      </div>
      <div className="bg-muted relative h-5 flex-1 overflow-hidden rounded-sm">
        <div
          className="bg-chart-1 motion-safe:animate-in motion-safe:slide-in-from-left-0 absolute inset-y-0 left-0 rounded-sm transition-all"
          style={{ width: `${normalizedWidth}%` }}
        />
      </div>
      <span className="w-16 shrink-0 text-right text-xs font-medium tabular-nums">
        {t("heroMaps", { count: mapCount })}
      </span>
    </div>
  );
}

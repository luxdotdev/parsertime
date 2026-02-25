"use client";

import { cn, toHero } from "@/lib/utils";
import {
  heroRoleMapping,
  roleHeroMapping,
  type HeroName,
} from "@/types/heroes";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback } from "react";

type HeroCompPickerProps = {
  teamLabel: string;
  selectedHeroes: string[];
  onSelectionChange: (heroes: string[]) => void;
  bannedHeroes: string[];
  assignments?: Record<string, string>;
};

const ROLE_LIMITS: Record<string, number> = {
  Tank: 1,
  Damage: 2,
  Support: 2,
};

const ROLE_ORDER: ("Tank" | "Damage" | "Support")[] = [
  "Tank",
  "Damage",
  "Support",
];

function countByRole(heroes: string[]): Record<string, number> {
  const counts: Record<string, number> = { Tank: 0, Damage: 0, Support: 0 };
  for (const hero of heroes) {
    const role = heroRoleMapping[hero as HeroName];
    if (role) counts[role]++;
  }
  return counts;
}

export function HeroCompPicker({
  teamLabel,
  selectedHeroes,
  onSelectionChange,
  bannedHeroes,
  assignments,
}: HeroCompPickerProps) {
  const t = useTranslations("dataLabeling.labeling");
  const roleCounts = countByRole(selectedHeroes);

  const toggleHero = useCallback(
    (hero: string) => {
      if (bannedHeroes.includes(hero)) return;

      if (selectedHeroes.includes(hero)) {
        onSelectionChange(selectedHeroes.filter((h) => h !== hero));
        return;
      }

      const role = heroRoleMapping[hero as HeroName];
      if (!role) return;

      const currentCount = countByRole(selectedHeroes)[role];
      if (currentCount >= ROLE_LIMITS[role]) return;

      onSelectionChange([...selectedHeroes, hero]);
    },
    [selectedHeroes, onSelectionChange, bannedHeroes]
  );

  const slots = [
    { role: "Tank" as const, index: 0 },
    { role: "Damage" as const, index: 0 },
    { role: "Damage" as const, index: 1 },
    { role: "Support" as const, index: 0 },
    { role: "Support" as const, index: 1 },
  ];

  function getSlotHero(role: "Tank" | "Damage" | "Support", index: number) {
    const heroesInRole = selectedHeroes.filter(
      (h) => heroRoleMapping[h as HeroName] === role
    );
    return heroesInRole[index];
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">
        {t("team1Comp", { team: teamLabel })}
      </h3>

      <div className="flex items-center gap-2">
        {slots.map(({ role, index }) => {
          const hero = getSlotHero(role, index);
          const assignedPlayer = hero ? assignments?.[hero] : undefined;
          return (
            <div key={`${role}-${index}`} className="flex flex-col items-center gap-0.5">
              <div
                className={cn(
                  "bg-muted flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border",
                  hero && "border-primary"
                )}
              >
                {hero ? (
                  <Image
                    src={`/heroes/${toHero(hero)}.png`}
                    alt={hero}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-muted-foreground text-[10px]">
                    {t(role.toLowerCase() as "tank" | "damage" | "support")}
                  </span>
                )}
              </div>
              <span className="text-muted-foreground w-12 truncate text-center text-[9px] leading-tight">
                {assignedPlayer ?? "\u00A0"}
              </span>
            </div>
          );
        })}
        <span className="text-muted-foreground ml-2 text-xs">
          {selectedHeroes.length}/5
        </span>
      </div>

      <div className="space-y-2">
        {ROLE_ORDER.map((role) => {
          const heroes = roleHeroMapping[role];
          const isFull = roleCounts[role] >= ROLE_LIMITS[role];

          return (
            <div key={role}>
              <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs font-medium">
                <span>
                  {t(role.toLowerCase() as "tank" | "damage" | "support")}
                </span>
                <span className="tabular-nums">
                  ({roleCounts[role]}/{ROLE_LIMITS[role]})
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {heroes.map((hero) => {
                  const isBanned = bannedHeroes.includes(hero);
                  const isSelected = selectedHeroes.includes(hero);
                  const isDisabled = isBanned || (isFull && !isSelected);

                  return (
                    <button
                      key={hero}
                      type="button"
                      onClick={() => toggleHero(hero)}
                      disabled={isDisabled}
                      aria-label={
                        isBanned ? `${hero} (${t("heroBanned")})` : `${hero}`
                      }
                      aria-pressed={isSelected}
                      className={cn(
                        "relative h-11 w-11 overflow-hidden rounded-md border transition-opacity",
                        isSelected && "ring-primary ring-2 ring-offset-1",
                        isBanned && "cursor-not-allowed opacity-25 grayscale",
                        isDisabled &&
                          !isBanned &&
                          "cursor-not-allowed opacity-50",
                        !isDisabled &&
                          !isSelected &&
                          "hover:ring-muted-foreground cursor-pointer hover:ring-1"
                      )}
                    >
                      <Image
                        src={`/heroes/${toHero(hero)}.png`}
                        alt={hero}
                        width={44}
                        height={44}
                        className="h-full w-full object-cover"
                      />
                      {isBanned && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-destructive/80 rounded px-0.5 text-[8px] font-bold text-white uppercase">
                            {t("heroBanned")}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

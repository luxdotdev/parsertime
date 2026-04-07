"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useColorblindMode } from "@/hooks/use-colorblind-mode";
import { toHero } from "@/lib/utils";
import { roleHeroMapping } from "@/types/heroes";
import type { RoleName } from "@/types/heroes";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";

type HeroSidebarProps = {
  onHeroSelect: (heroName: string, team: 1 | 2) => void;
  pendingHero: string | null;
};

const ROLES: RoleName[] = ["Tank", "Damage", "Support"];
const ROLE_I18N_KEYS: Record<RoleName, string> = {
  Tank: "tank",
  Damage: "damage",
  Support: "support",
};

export function HeroSidebar({ onHeroSelect, pendingHero }: HeroSidebarProps) {
  const t = useTranslations("coaching.sidebar");
  const { team1, team2 } = useColorblindMode();
  const [activeTeam, setActiveTeam] = useState<"1" | "2">("1");

  return (
    <div className="flex h-full flex-col">
      <Tabs
        value={activeTeam}
        onValueChange={(v) => setActiveTeam(v as "1" | "2")}
        className="flex h-full flex-col"
      >
        <TabsList className="mx-2 mt-2 grid w-auto grid-cols-2">
          <TabsTrigger
            value="1"
            className="relative"
            style={{
              borderBottom:
                activeTeam === "1" ? `2px solid ${team1}` : undefined,
            }}
          >
            <span
              className="mr-1.5 inline-block size-2.5 rounded-full"
              style={{ backgroundColor: team1 }}
            />
            {t("team1")}
          </TabsTrigger>
          <TabsTrigger
            value="2"
            className="relative"
            style={{
              borderBottom:
                activeTeam === "2" ? `2px solid ${team2}` : undefined,
            }}
          >
            <span
              className="mr-1.5 inline-block size-2.5 rounded-full"
              style={{ backgroundColor: team2 }}
            />
            {t("team2")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="1" className="mt-0 min-h-0 flex-1">
          <HeroGrid
            team={1}
            teamColor={team1}
            onSelect={onHeroSelect}
            pendingHero={pendingHero}
            t={t}
          />
        </TabsContent>
        <TabsContent value="2" className="mt-0 min-h-0 flex-1">
          <HeroGrid
            team={2}
            teamColor={team2}
            onSelect={onHeroSelect}
            pendingHero={pendingHero}
            t={t}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HeroGrid({
  team,
  teamColor,
  onSelect,
  pendingHero,
  t,
}: {
  team: 1 | 2;
  teamColor: string;
  onSelect: (heroName: string, team: 1 | 2) => void;
  pendingHero: string | null;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-2">
        {ROLES.map((role) => (
          <div key={role}>
            <p className="text-muted-foreground mb-1 px-1 text-xs font-medium tracking-wider uppercase">
              {t(ROLE_I18N_KEYS[role])}
            </p>
            <div className="grid grid-cols-4 gap-1">
              {roleHeroMapping[role].map((heroName) => (
                <button
                  key={heroName}
                  type="button"
                  onClick={() => onSelect(heroName, team)}
                  className="hover:bg-accent group relative flex flex-col items-center rounded-md p-1 transition-colors"
                  title={heroName}
                >
                  <div
                    className="relative size-9 overflow-hidden rounded-full"
                    style={{
                      boxShadow:
                        pendingHero === heroName
                          ? `0 0 0 2px ${teamColor}`
                          : undefined,
                    }}
                  >
                    <Image
                      src={`/heroes/${toHero(heroName)}.png`}
                      alt={heroName}
                      fill
                      className="object-cover"
                      sizes="36px"
                    />
                  </div>
                  <span className="mt-0.5 max-w-full truncate text-[10px] leading-tight">
                    {heroName}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

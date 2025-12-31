"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, toHero, useHeroNames } from "@/lib/utils";
import {
  type HeroName,
  roleHeroMapping,
  subroleHeroMapping,
} from "@/types/heroes";
import Fuse from "fuse.js";
import {
  BowArrow,
  ChevronsUpDownIcon,
  Cross,
  Hammer,
  HeartPulse,
  PlaneTakeoff,
  RotateCcw,
  SearchIcon,
  Shield,
  Sword,
  Syringe,
  Target,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type HeroFilterProps = {
  selectedHeroes: HeroName[];
  onSelectionChange: (heroes: HeroName[]) => void;
};

const allHeroes: HeroName[] = [
  ...roleHeroMapping.Tank,
  ...roleHeroMapping.Damage,
  ...roleHeroMapping.Support,
];

function normalizeForSearch(input: string): string {
  return (
    input
      .toLowerCase()
      // remove punctuation/symbols (keeps letters/numbers/spaces)
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      // collapse whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

type FuseHeroItem = {
  hero: HeroName;
  searchKey: string;
};

export function HeroFilter({
  selectedHeroes,
  onSelectionChange,
}: HeroFilterProps) {
  const t = useTranslations("statsPage.playerStats.heroFilter");
  const heroNames = useHeroNames();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fuseItems = useMemo<FuseHeroItem[]>(() => {
    return allHeroes.map((hero) => ({
      hero,
      searchKey: normalizeForSearch(hero),
    }));
  }, []);

  const fuse = useMemo(() => {
    return new Fuse<FuseHeroItem>(fuseItems, {
      includeScore: true,
      ignoreDiacritics: true,
      threshold: 0.2,
      keys: ["searchKey"],
    });
  }, [fuseItems]);

  const isAllSelected = selectedHeroes.length === 0;

  function handleQuickSelect(heroes: HeroName[]) {
    onSelectionChange(heroes);
  }

  function handleReset() {
    onSelectionChange([]);
  }

  function toggleHero(hero: HeroName) {
    if (selectedHeroes.includes(hero)) {
      onSelectionChange(selectedHeroes.filter((h) => h !== hero));
    } else {
      onSelectionChange([...selectedHeroes, hero]);
    }
  }

  const filteredHeroes = useMemo<HeroName[]>(() => {
    if (!searchQuery) return allHeroes;

    const query = normalizeForSearch(searchQuery);
    return fuse.search(query).map((r) => r.item.hero);
  }, [searchQuery, fuse]);

  const groupedHeroes = useMemo(() => {
    const groups: Record<string, HeroName[]> = {
      Tank: [],
      Damage: [],
      Support: [],
    };

    filteredHeroes.forEach((hero) => {
      if (roleHeroMapping.Tank.includes(hero)) {
        groups.Tank.push(hero);
      } else if (roleHeroMapping.Damage.includes(hero)) {
        groups.Damage.push(hero);
      } else if (roleHeroMapping.Support.includes(hero)) {
        groups.Support.push(hero);
      }
    });

    return groups;
  }, [filteredHeroes]);

  function renderTriggerContent() {
    if (selectedHeroes.length === 0) {
      return <span>{t("allHeroes")}</span>;
    }

    if (selectedHeroes.length <= 3) {
      return (
        <div className="flex flex-wrap gap-1">
          {selectedHeroes.map((hero) => (
            <Badge key={hero} variant="outline" className="text-xs">
              {heroNames.get(toHero(hero)) ?? hero}
            </Badge>
          ))}
        </div>
      );
    }

    return <span>{t("heroesSelected", { count: selectedHeroes.length })}</span>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-auto min-h-9 w-[280px] justify-between px-3 py-1.5"
        >
          <div className="flex-1 overflow-hidden text-left">
            {renderTriggerContent()}
          </div>
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[600px] p-0" align="start">
        <div className="flex flex-col gap-3 p-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">{t("quickSelect")}</Label>
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className={cn(
                  "h-8 gap-2 text-xs",
                  isAllSelected && "border-primary bg-primary/10"
                )}
              >
                <RotateCcw className="h-4 w-4" />
                {t("reset")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(roleHeroMapping.Tank)}
                className="h-8 gap-2 text-xs"
              >
                <Shield className="h-4 w-4" />
                {t("allTanks")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(roleHeroMapping.Damage)}
                className="h-8 gap-2 text-xs"
              >
                <Sword className="h-4 w-4" />
                {t("allDamage")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(roleHeroMapping.Support)}
                className="h-8 gap-2 text-xs"
              >
                <Cross className="h-4 w-4" />
                {t("allSupport")}
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleQuickSelect(subroleHeroMapping.HitscanDamage)
                }
                className="h-8 gap-2 text-xs"
              >
                <Target className="h-4 w-4" />
                {t("hitscanDPS")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(subroleHeroMapping.FlexDamage)}
                className="h-8 gap-2 text-xs"
              >
                <BowArrow className="h-4 w-4" />
                {t("flexDPS")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(subroleHeroMapping.GroundTank)}
                className="h-8 gap-2 text-xs"
              >
                <Hammer className="h-4 w-4" />
                {t("groundTanks")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(subroleHeroMapping.DiveTank)}
                className="h-8 gap-2 text-xs"
              >
                <PlaneTakeoff className="h-4 w-4" />
                {t("diveTanks")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleQuickSelect(subroleHeroMapping.FlexSupport)
                }
                className="h-8 gap-2 text-xs"
              >
                <Syringe className="h-4 w-4" />
                {t("flexSupports")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleQuickSelect(subroleHeroMapping.MainSupport)
                }
                className="h-8 text-xs"
              >
                <HeartPulse className="h-4 w-4" />
                {t("mainSupports")}
              </Button>
            </div>
          </div>

          <div className="relative">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder={t("searchHeroes")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-[400px] space-y-3 overflow-y-auto">
            {Object.entries(groupedHeroes).map(([role, heroes]) => {
              if (heroes.length === 0) return null;

              return (
                <div key={role} className="space-y-2">
                  <Label className="text-muted-foreground text-xs font-semibold">
                    {t(role.toLowerCase() as "tank" | "damage" | "support")}
                  </Label>
                  <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2 lg:grid-cols-4">
                    {heroes.map((hero) => {
                      const isChecked = selectedHeroes.includes(hero);
                      return (
                        <div
                          key={hero}
                          className="hover:bg-accent flex cursor-pointer items-center space-x-2 rounded-sm p-2"
                          onClick={() => toggleHero(hero)}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleHero(hero)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Label
                            htmlFor={hero}
                            className="flex-1 cursor-pointer text-sm font-normal"
                          >
                            {heroNames.get(toHero(hero)) ?? hero}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {filteredHeroes.length === 0 && (
              <div className="text-muted-foreground py-6 text-center text-sm">
                {t("noHeroesFound")}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

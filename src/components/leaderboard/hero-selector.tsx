"use client";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, toHero, useHeroNames } from "@/lib/utils";
import { type HeroName, roleHeroMapping } from "@/types/heroes";
import { Check, ChevronsUpDown } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

export function HeroSelector({ currentHero }: { currentHero?: HeroName }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const heroNames = useHeroNames();

  function handleSelect(hero: HeroName) {
    const params = new URLSearchParams(searchParams);
    params.set("hero", hero);
    router.push(`${pathname}?${params.toString()}` as Route);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {currentHero
            ? (heroNames.get(toHero(currentHero)) ?? currentHero)
            : "Select hero..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search hero..." />
          <CommandList>
            <CommandEmpty>No hero found.</CommandEmpty>
            {(
              Object.keys(roleHeroMapping) as (keyof typeof roleHeroMapping)[]
            ).map((role) => (
              <CommandGroup key={role} heading={role}>
                {roleHeroMapping[role].map((hero) => (
                  <CommandItem
                    key={hero}
                    value={hero}
                    onSelect={() => {
                      handleSelect(hero);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        currentHero === hero ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {heroNames.get(toHero(hero)) ?? hero}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

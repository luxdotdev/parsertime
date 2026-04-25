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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MapHeroTrendGroup } from "@/data/map/hero-trends-service";
import {
  cn,
  toHero,
  toKebabCase,
  useHeroNames,
  useMapNames,
} from "@/lib/utils";
import {
  SUBROLE_DISPLAY_NAMES,
  SUBROLE_ORDER,
  type RoleName,
  type SubroleName,
} from "@/types/heroes";
import { $Enums } from "@prisma/client";
import { CheckIcon, ChevronsUpDownIcon, LayersIcon } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

type RoleFilter = "All" | RoleName | SubroleName;
type SortKey = "playtime" | "pickRate" | "winrate" | "trend";

const primaryRoles: { value: RoleFilter; label: string }[] = [
  { value: "All", label: "All" },
  { value: "Tank", label: "Tank" },
  { value: "Damage", label: "Damage" },
  { value: "Support", label: "Support" },
];

const subroleFilters: { value: RoleFilter; label: string }[] =
  SUBROLE_ORDER.map((s) => ({ value: s, label: SUBROLE_DISPLAY_NAMES[s] }));

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "pickRate", label: "Pick rate" },
  { value: "playtime", label: "Playtime" },
  { value: "winrate", label: "Winrate" },
  { value: "trend", label: "Trend" },
];

const MAP_TYPE_ORDER: $Enums.MapType[] = [
  $Enums.MapType.Control,
  $Enums.MapType.Escort,
  $Enums.MapType.Hybrid,
  $Enums.MapType.Push,
  $Enums.MapType.Flashpoint,
  $Enums.MapType.Clash,
];

function formatPlaytime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  return `${minutes}m`;
}

function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}

const COLS =
  "grid-cols-[2.5rem_minmax(0,1fr)_5rem_5.5rem_5.5rem_5.5rem_4.5rem_5.5rem]";

export function MapHeroTrends({
  allMaps,
  perMap,
}: {
  allMaps: MapHeroTrendGroup;
  perMap: MapHeroTrendGroup[];
}) {
  const heroNames = useHeroNames();
  const mapNames = useMapNames();
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("All");
  const [sortKey, setSortKey] = useState<SortKey>("pickRate");
  const [mapPickerOpen, setMapPickerOpen] = useState(false);

  const selectedGroup = useMemo(() => {
    if (selectedMap === null) return allMaps;
    return perMap.find((g) => g.mapName === selectedMap) ?? allMaps;
  }, [allMaps, perMap, selectedMap]);

  const mapsByType = useMemo(() => {
    const byType = new Map<$Enums.MapType, MapHeroTrendGroup[]>();
    const other: MapHeroTrendGroup[] = [];
    for (const group of perMap) {
      if (group.mapType) {
        const existing = byType.get(group.mapType) ?? [];
        existing.push(group);
        byType.set(group.mapType, existing);
      } else {
        other.push(group);
      }
    }
    return { byType, other };
  }, [perMap]);

  const heroes = useMemo(() => {
    if (!selectedGroup) return [];
    const filtered = selectedGroup.heroes.filter((hero) => {
      if (roleFilter === "All") return true;
      if (
        roleFilter === "Tank" ||
        roleFilter === "Damage" ||
        roleFilter === "Support"
      ) {
        return hero.role === roleFilter;
      }
      return hero.subrole === roleFilter;
    });
    return [...filtered].sort((a, b) => {
      if (sortKey === "playtime") return b.totalPlaytime - a.totalPlaytime;
      if (sortKey === "pickRate") return b.pickRate - a.pickRate;
      if (sortKey === "winrate") return b.winrate - a.winrate;
      return b.playtimeTrend - a.playtimeTrend;
    });
  }, [roleFilter, selectedGroup, sortKey]);

  const isAllMaps = selectedMap === null;

  if (perMap.length === 0) {
    return (
      <div className="px-6 pt-10 pb-16 sm:px-10">
        <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
          Map Meta · Last 60 days
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          No recent map data
        </h1>
        <p className="text-muted-foreground mt-2 max-w-prose text-sm">
          Upload a scrim in the last 60 days to populate this view.
        </p>
      </div>
    );
  }

  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b pb-6">
        <div>
          <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
            Map Meta · Last 60 days
            {isAllMaps ? ` · ${perMap.length} unique maps` : null}
          </p>
          <h1 className="mt-3 text-4xl leading-none font-semibold tracking-tight">
            {selectedGroup.mapName}
          </h1>
        </div>
        <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-2 font-mono">
          <Stat label="Scrims" value={selectedGroup.scrimsAnalyzed} />
          <Stat label="Maps" value={selectedGroup.mapsAnalyzed} />
          <Stat label="Heroes" value={selectedGroup.heroes.length} />
        </dl>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Popover open={mapPickerOpen} onOpenChange={setMapPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={mapPickerOpen}
              className="h-9 w-full justify-between sm:w-[280px]"
            >
              {isAllMaps ? (
                <div className="flex min-w-0 items-center gap-2">
                  <span className="bg-muted text-muted-foreground flex h-5 w-9 items-center justify-center rounded-sm">
                    <LayersIcon className="size-3.5" />
                  </span>
                  <span className="truncate">All maps</span>
                </div>
              ) : (
                <div className="flex min-w-0 items-center gap-2">
                  <Image
                    src={`/maps/${toKebabCase(selectedGroup.mapName)}.webp`}
                    alt={
                      mapNames.get(toKebabCase(selectedGroup.mapName)) ??
                      selectedGroup.mapName
                    }
                    width={36}
                    height={20}
                    className="rounded-sm object-cover"
                  />
                  <span className="truncate">
                    {mapNames.get(toKebabCase(selectedGroup.mapName)) ??
                      selectedGroup.mapName}
                  </span>
                </div>
              )}
              <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search maps..." />
              <CommandList>
                <CommandEmpty>No maps found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="All maps"
                    onSelect={() => {
                      setSelectedMap(null);
                      setMapPickerOpen(false);
                    }}
                  >
                    <CheckIcon
                      className={cn(
                        "mr-2 size-4",
                        isAllMaps ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="bg-muted text-muted-foreground mr-2 flex h-5 w-9 items-center justify-center rounded-sm">
                      <LayersIcon className="size-3.5" />
                    </span>
                    <span>All maps</span>
                  </CommandItem>
                </CommandGroup>
                {MAP_TYPE_ORDER.map((type) => {
                  const mapsInType = mapsByType.byType.get(type);
                  if (!mapsInType || mapsInType.length === 0) return null;
                  return (
                    <CommandGroup key={type} heading={type}>
                      {mapsInType.map((g) => (
                        <MapCommandItem
                          key={g.mapName}
                          group={g}
                          selected={selectedMap === g.mapName}
                          onSelect={() => {
                            setSelectedMap(g.mapName);
                            setMapPickerOpen(false);
                          }}
                          displayName={
                            mapNames.get(toKebabCase(g.mapName)) ?? g.mapName
                          }
                        />
                      ))}
                    </CommandGroup>
                  );
                })}
                {mapsByType.other.length > 0 ? (
                  <CommandGroup heading="Other">
                    {mapsByType.other.map((g) => (
                      <MapCommandItem
                        key={g.mapName}
                        group={g}
                        selected={selectedMap === g.mapName}
                        onSelect={() => {
                          setSelectedMap(g.mapName);
                          setMapPickerOpen(false);
                        }}
                        displayName={
                          mapNames.get(toKebabCase(g.mapName)) ?? g.mapName
                        }
                      />
                    ))}
                  </CommandGroup>
                ) : null}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <FilterPills
          filters={primaryRoles}
          value={roleFilter}
          onChange={setRoleFilter}
        />

        <div className="ml-auto flex items-center gap-2">
          <span className="text-muted-foreground hidden font-mono text-[11px] tracking-wider uppercase sm:inline">
            Sort
          </span>
          <Select
            value={sortKey}
            onValueChange={(v) => setSortKey(v as SortKey)}
          >
            <SelectTrigger className="h-9 w-40 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-1 gap-y-1">
        {subroleFilters.map((f) => {
          const active = roleFilter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setRoleFilter(active ? "All" : f.value)}
              className={cn(
                "rounded-sm px-2 py-0.5 text-xs transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <section className="mt-8">
        <div
          className={cn(
            "text-muted-foreground border-border grid items-center gap-4 border-b pb-3 font-mono text-[11px] tracking-[0.14em] uppercase",
            COLS
          )}
        >
          <div>#</div>
          <div>Hero</div>
          <div>Role</div>
          <div className="text-right">Playtime</div>
          <div className="text-right">Pick</div>
          <div className="text-right">Winrate</div>
          <div className="text-right">Sample</div>
          <div className="text-right">Δ 30d</div>
        </div>

        {heroes.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center text-sm">
            No heroes match the selected filter.
          </div>
        ) : (
          <ul key={selectedMap ?? "all-maps"}>
            {heroes.map((hero, index) => (
              <HeroRow
                key={hero.hero}
                index={index}
                hero={hero}
                name={heroNames.get(toHero(hero.hero)) ?? hero.hero}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MapCommandItem({
  group,
  selected,
  displayName,
  onSelect,
}: {
  group: MapHeroTrendGroup;
  selected: boolean;
  displayName: string;
  onSelect: () => void;
}) {
  const kebab = toKebabCase(group.mapName);
  return (
    <CommandItem value={displayName} onSelect={onSelect}>
      <CheckIcon
        className={cn("mr-2 size-4", selected ? "opacity-100" : "opacity-0")}
      />
      <Image
        src={`/maps/${kebab}.webp`}
        alt={displayName}
        width={36}
        height={20}
        className="rounded-sm object-cover"
      />
      <span>{displayName}</span>
    </CommandItem>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-muted-foreground text-[11px] tracking-wider uppercase">
        {label}
      </dt>
      <dd className="text-lg font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function FilterPills({
  filters,
  value,
  onChange,
}: {
  filters: { value: RoleFilter; label: string }[];
  value: RoleFilter;
  onChange: (v: RoleFilter) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Role filter"
      className="border-border bg-card flex rounded-md border p-0.5"
    >
      {filters.map((f) => {
        const active = value === f.value;
        return (
          <button
            key={f.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(f.value)}
            className={cn(
              "h-8 rounded-sm px-3 text-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

type HeroRowData = {
  hero: string;
  role: string;
  subrole: SubroleName | null;
  totalPlaytime: number;
  pickRate: number;
  wins: number;
  losses: number;
  winrate: number;
  samples: number;
  playtimeTrend: number;
};

function HeroRow({
  index,
  hero,
  name,
}: {
  index: number;
  hero: HeroRowData;
  name: string;
}) {
  const isTop = index === 0;
  const rank = String(index + 1).padStart(2, "0");
  const games = hero.wins + hero.losses;
  const trend = hero.playtimeTrend;
  const trendUp = trend > 1;
  const trendDown = trend < -1;
  const trendFlat = !trendUp && !trendDown;

  return (
    <li
      className={cn(
        "border-border hover:bg-muted/40 group grid items-center gap-4 border-b py-3 transition-colors",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:[animation-fill-mode:both]",
        COLS
      )}
      style={{ animationDelay: `${Math.min(index, 20) * 15}ms` }}
    >
      <div
        className={cn(
          "font-mono text-sm tabular-nums",
          isTop ? "text-primary" : "text-muted-foreground"
        )}
      >
        {rank}
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <Image
          src={`/heroes/${toHero(hero.hero)}.png`}
          alt={name}
          width={36}
          height={36}
          className="border-border/70 h-9 w-9 rounded-[4px] border object-cover"
        />
        <div className="min-w-0">
          <div
            className={cn(
              "truncate leading-tight font-medium",
              isTop && "text-primary"
            )}
          >
            {name}
          </div>
          {hero.subrole ? (
            <div className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
              {SUBROLE_DISPLAY_NAMES[hero.subrole]}
            </div>
          ) : null}
        </div>
      </div>

      <div className="text-muted-foreground font-mono text-[11px] tracking-wider uppercase">
        {hero.role}
      </div>

      <div className="text-right font-mono text-sm tabular-nums">
        {formatPlaytime(hero.totalPlaytime)}
      </div>

      <div className="text-right font-mono text-sm tabular-nums">
        {formatPercent(hero.pickRate)}
      </div>

      <div className="text-right">
        <div className="font-mono text-sm tabular-nums">
          {games > 0 ? formatPercent(hero.winrate) : "—"}
        </div>
        {games > 0 ? (
          <div className="text-muted-foreground font-mono text-[10px] tabular-nums">
            {hero.wins}W · {hero.losses}L
          </div>
        ) : null}
      </div>

      <div className="text-muted-foreground text-right font-mono text-sm tabular-nums">
        {hero.samples.toLocaleString("en-US")}
      </div>

      <div
        className={cn(
          "flex items-baseline justify-end gap-1.5 font-mono text-sm tabular-nums",
          trendUp && "text-foreground",
          (trendDown || trendFlat) && "text-muted-foreground"
        )}
      >
        <span aria-hidden className="text-xs leading-none">
          {trendUp ? "↑" : trendDown ? "↓" : "·"}
        </span>
        <span>
          {Math.abs(trend) < 0.5 ? "—" : `${Math.round(Math.abs(trend))}%`}
        </span>
      </div>
    </li>
  );
}

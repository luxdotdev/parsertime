"use client";

import { createMatches } from "@/app/ranked/actions";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { TimePicker } from "@/components/ui/time-picker";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  getHeroRole,
  heroRoleMapping,
  roleHeroMapping,
  type RoleName,
} from "@/types/heroes";
import { RANKED_MAPS } from "@/lib/ranked/maps";
import {
  cn,
  heroImageUrl,
  mapImageUrl,
  toKebabCase,
  useMapNames,
} from "@/lib/utils";
import Fuse from "fuse.js";
import { format } from "date-fns";
import {
  CalendarIcon,
  Check,
  ChevronsUpDown,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";

// Build hero/map data from @/types/* ----------------------------------------

/** All hero names from the role mapping */
const ALL_HEROES: { name: string; role: RoleName }[] = Object.entries(
  heroRoleMapping
).map(([name, role]) => ({ name, role }));

/** Hero names grouped by role */
const HEROES_BY_ROLE: Record<RoleName, string[]> = roleHeroMapping;

/** The definitive ranked map list (deduped, seasonal variants removed). */
const MAPS = RANKED_MAPS;

// ---------------------------------------------------------------------------

type HeroSelection = {
  hero: string;
  percentage: number;
};

type MatchEntry = {
  id: string;
  map: string;
  result: "win" | "loss" | "draw" | "";
  groupSize: string;
  playedAt: Date;
  heroes: HeroSelection[];
};

let matchEntryCounter = 0;
function nextMatchEntryId() {
  return `match-entry-${++matchEntryCounter}`;
}

const PERCENTAGE_PRESETS = [25, 50, 75, 100] as const;

function handleComboboxWheel(e: React.WheelEvent<HTMLDivElement>) {
  const list = e.currentTarget.querySelector<HTMLElement>("[cmdk-list]");
  if (!list) return;
  const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
  list.scrollTop += delta;
}

const GROUP_SIZE_OPTIONS = [
  { value: "1", labelKey: "groupSizeSolo" },
  { value: "2", labelKey: "groupSizeDuo" },
  { value: "3", labelKey: "groupSizeStack3" },
  { value: "4", labelKey: "groupSizeStack4" },
  { value: "5", labelKey: "groupSizeStack5" },
] as const;

function createEmptyMatch(): MatchEntry {
  return {
    id: nextMatchEntryId(),
    map: "",
    result: "",
    groupSize: "1",
    playedAt: new Date(),
    heroes: [],
  };
}

function distributePercentages(heroes: HeroSelection[]): HeroSelection[] {
  if (heroes.length === 0) return heroes;
  if (heroes.length === 1) return [{ ...heroes[0], percentage: 100 }];

  const base = Math.floor(100 / heroes.length);
  const remainder = 100 - base * heroes.length;
  return heroes.map((h, i) => ({
    ...h,
    percentage: base + (i < remainder ? 1 : 0),
  }));
}

function normalizeForSearch(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

type FuseHeroItem = {
  name: string;
  role: RoleName;
  searchKey: string;
};

function fuzzyScore(value: string, search: string): number {
  const v = value.toLowerCase();
  const s = search.toLowerCase();

  if (v === s) return 1;
  if (v.startsWith(s)) return 0.9;
  if (v.includes(s)) return 0.75;

  let vi = 0;
  let gaps = 0;
  for (const ch of s) {
    const idx = v.indexOf(ch, vi);
    if (idx === -1) return 0;
    if (idx > vi) gaps += idx - vi;
    vi = idx + 1;
  }

  return Math.max(0.1, 0.6 * (1 - gaps / v.length));
}

type MatchFormProps = {
  trigger: React.ReactNode;
};

export function MatchForm({ trigger }: MatchFormProps) {
  const t = useTranslations("ranked.form");
  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<MatchEntry[]>([createEmptyMatch()]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateMatch(index: number, updates: Partial<MatchEntry>) {
    setMatches((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...updates } : m))
    );
  }

  function removeMatch(index: number) {
    setMatches((prev) => prev.filter((_, i) => i !== index));
  }

  function addHero(matchIndex: number, heroName: string) {
    setMatches((prev) =>
      prev.map((m, i) => {
        if (i !== matchIndex) return m;
        if (m.heroes.some((h) => h.hero === heroName)) return m;
        const updated = distributePercentages([
          ...m.heroes,
          { hero: heroName, percentage: 0 },
        ]);
        return { ...m, heroes: updated };
      })
    );
  }

  function removeHero(matchIndex: number, heroName: string) {
    setMatches((prev) =>
      prev.map((m, i) => {
        if (i !== matchIndex) return m;
        const filtered = m.heroes.filter((h) => h.hero !== heroName);
        return { ...m, heroes: distributePercentages(filtered) };
      })
    );
  }

  function updateHeroPercentage(
    matchIndex: number,
    heroName: string,
    percentage: number
  ) {
    setMatches((prev) =>
      prev.map((m, i) => {
        if (i !== matchIndex) return m;
        return {
          ...m,
          heroes: m.heroes.map((h) =>
            h.hero === heroName ? { ...h, percentage } : h
          ),
        };
      })
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      if (!m.map) {
        setError(t("errorSelectMap", { n: i + 1 }));
        return;
      }
      if (!m.result) {
        setError(t("errorSelectResult", { n: i + 1 }));
        return;
      }
      if (m.heroes.length === 0) {
        setError(t("errorAddHero", { n: i + 1 }));
        return;
      }
      const total = m.heroes.reduce((sum, h) => sum + h.percentage, 0);
      if (total !== 100) {
        setError(t("errorHeroSum", { n: i + 1, total }));
        return;
      }
    }

    startTransition(async () => {
      const result = await createMatches(
        matches.map((m) => ({
          map: m.map,
          result: m.result as "win" | "loss" | "draw",
          groupSize: parseInt(m.groupSize, 10),
          playedAt: m.playedAt.toISOString(),
          heroes: m.heroes.map((h) => ({
            hero: h.hero,
            percentage: h.percentage,
          })),
        }))
      );

      if (result.success) {
        setOpen(false);
        setMatches([createEmptyMatch()]);
        setError(null);
      } else {
        setError(result.error ?? t("errorGeneric"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription className="text-pretty">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            {matches.map((match, matchIndex) => (
              <MatchEntryCard
                key={match.id}
                match={match}
                matchIndex={matchIndex}
                totalMatches={matches.length}
                onUpdate={(updates) => updateMatch(matchIndex, updates)}
                onRemove={() => removeMatch(matchIndex)}
                onAddHero={(hero) => addHero(matchIndex, hero)}
                onRemoveHero={(hero) => removeHero(matchIndex, hero)}
                onUpdateHeroPercentage={(hero, pct) =>
                  updateHeroPercentage(matchIndex, hero, pct)
                }
              />
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setMatches((prev) => [...prev, createEmptyMatch()])
              }
              className="w-full"
            >
              <Plus className="mr-1.5 size-4" />
              {t("addAnother")}
            </Button>
          </div>

          {error && <p className="text-destructive mt-4 text-sm">{error}</p>}

          <DialogFooter className="mt-6">
            <Button
              type="submit"
              disabled={isPending}
              className="active:scale-[0.97]"
            >
              {isPending
                ? t("submitting")
                : t("submit", { count: matches.length })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type MatchEntryCardProps = {
  match: MatchEntry;
  matchIndex: number;
  totalMatches: number;
  onUpdate: (updates: Partial<MatchEntry>) => void;
  onRemove: () => void;
  onAddHero: (hero: string) => void;
  onRemoveHero: (hero: string) => void;
  onUpdateHeroPercentage: (hero: string, percentage: number) => void;
};

function MatchEntryCard({
  match,
  matchIndex,
  totalMatches,
  onUpdate,
  onRemove,
  onAddHero,
  onRemoveHero,
  onUpdateHeroPercentage,
}: MatchEntryCardProps) {
  const t = useTranslations("ranked.form");
  return (
    <fieldset className="border-border space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <legend className="text-sm font-medium">
          {t("matchHeading", { n: matchIndex + 1 })}
        </legend>
        {totalMatches > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            aria-label={t("removeMatch", { n: matchIndex + 1 })}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MapPicker value={match.map} onChange={(map) => onUpdate({ map })} />
        <DateTimePicker
          value={match.playedAt}
          onChange={(date) => onUpdate({ playedAt: date })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("result")}</label>
          <ToggleGroup
            type="single"
            variant="outline"
            value={match.result}
            onValueChange={(value) => {
              if (value) onUpdate({ result: value as MatchEntry["result"] });
            }}
            className="w-full"
          >
            <ToggleGroupItem
              value="win"
              className="data-[state=on]:bg-primary/15 data-[state=on]:text-primary flex-1 rounded-l-md!"
            >
              {t("win")}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="loss"
              className="data-[state=on]:bg-destructive/15 data-[state=on]:text-destructive flex-1"
            >
              {t("loss")}
            </ToggleGroupItem>
            <ToggleGroupItem value="draw" className="flex-1 rounded-r-md!">
              {t("draw")}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("groupSize")}</label>
          <Select
            value={match.groupSize}
            onValueChange={(value) => onUpdate({ groupSize: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUP_SIZE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <HeroPicker
        heroes={match.heroes}
        onAddHero={onAddHero}
        onRemoveHero={onRemoveHero}
        onUpdatePercentage={onUpdateHeroPercentage}
      />
    </fieldset>
  );
}

function MapPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (map: string) => void;
}) {
  const t = useTranslations("ranked.form");
  const [open, setOpen] = useState(false);
  const mapNames = useMapNames();

  const selectedDisplay = value
    ? (mapNames.get(toKebabCase(value)) ?? value)
    : null;

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{t("map")}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {selectedDisplay ? (
              <span className="flex min-w-0 items-center gap-2">
                <Image
                  src={mapImageUrl(value)}
                  alt={selectedDisplay}
                  width={40}
                  height={23}
                  className="shrink-0 rounded-sm object-cover"
                />
                <span className="truncate">{selectedDisplay}</span>
              </span>
            ) : (
              t("selectMap")
            )}
            <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-(--radix-popover-trigger-width) p-0"
          align="start"
          onWheel={handleComboboxWheel}
        >
          <Command filter={fuzzyScore}>
            <CommandInput placeholder={t("searchMaps")} />
            <CommandList>
              <CommandEmpty>{t("noMaps")}</CommandEmpty>
              <CommandGroup>
                {MAPS.map((map) => {
                  const displayName =
                    mapNames.get(toKebabCase(map.name)) ?? map.name;
                  return (
                    <CommandItem
                      key={map.name}
                      value={displayName}
                      data-checked={value === map.name || undefined}
                      onSelect={() => {
                        onChange(map.name);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "size-4 shrink-0",
                          value === map.name ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <Image
                        src={mapImageUrl(map.name)}
                        alt={displayName}
                        width={40}
                        height={23}
                        className="shrink-0 rounded-sm object-cover"
                      />
                      <span className="truncate">{displayName}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function DateTimePicker({
  value,
  onChange,
}: {
  value: Date;
  onChange: (date: Date) => void;
}) {
  const t = useTranslations("ranked.form");

  function handleDaySelect(day: Date | undefined) {
    if (!day) return;
    const updated = new Date(day);
    updated.setHours(value.getHours(), value.getMinutes(), 0, 0);
    onChange(updated);
  }

  function handleTimeChange(date: Date | undefined) {
    if (!date) return;
    onChange(date);
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{t("dateTime")}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start text-left font-normal"
          >
            <CalendarIcon className="mr-2 size-4" aria-hidden="true" />
            {format(value, "PPP p")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleDaySelect}
            disabled={(date) => date > new Date()}
          />
          <div className="border-border border-t p-3">
            <TimePicker date={value} setDate={handleTimeChange} />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function HeroPicker({
  heroes,
  onAddHero,
  onRemoveHero,
  onUpdatePercentage,
}: {
  heroes: HeroSelection[];
  onAddHero: (hero: string) => void;
  onRemoveHero: (hero: string) => void;
  onUpdatePercentage: (hero: string, percentage: number) => void;
}) {
  const t = useTranslations("ranked.form");
  const selectedHeroNames = new Set(heroes.map((h) => h.hero));
  const totalPercentage = heroes.reduce((sum, h) => sum + h.percentage, 0);
  const preferredRole =
    heroes.length > 0 ? getHeroRole(heroes[0].hero) : undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{t("heroesPlayed")}</label>
        {heroes.length > 0 && (
          <span
            className={`text-xs tabular-nums ${
              totalPercentage === 100
                ? "text-muted-foreground"
                : "text-destructive"
            }`}
          >
            {t("percentTotal", { total: totalPercentage })}
          </span>
        )}
      </div>

      {heroes.length > 0 && (
        <div className="space-y-2">
          {heroes.map((selection) => (
            <HeroRow
              key={selection.hero}
              selection={selection}
              onRemove={() => onRemoveHero(selection.hero)}
              onUpdatePercentage={(pct) =>
                onUpdatePercentage(selection.hero, pct)
              }
            />
          ))}
          {totalPercentage !== 100 && (
            <p className="text-destructive text-xs">{t("percentSum")}</p>
          )}
        </div>
      )}

      <HeroCombobox
        selectedHeroNames={selectedHeroNames}
        preferredRole={preferredRole}
        onSelect={onAddHero}
      />
    </div>
  );
}

function HeroRow({
  selection,
  onRemove,
  onUpdatePercentage,
}: {
  selection: HeroSelection;
  onRemove: () => void;
  onUpdatePercentage: (percentage: number) => void;
}) {
  const t = useTranslations("ranked.form");
  const [rawValue, setRawValue] = useState(String(selection.percentage));
  const activePreset = PERCENTAGE_PRESETS.find(
    (p) => p === selection.percentage
  );

  useEffect(() => {
    setRawValue(String(selection.percentage));
  }, [selection.percentage]);

  return (
    <div className="bg-muted/50 flex items-center gap-3 rounded-md p-2">
      <Image
        src={heroImageUrl(selection.hero)}
        alt={selection.hero}
        width={32}
        height={32}
        className="size-8 rounded"
      />
      <span className="min-w-0 flex-1 truncate text-sm">{selection.hero}</span>

      <div className="flex items-center gap-1">
        {PERCENTAGE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onUpdatePercentage(preset)}
            className={`min-h-[44px] min-w-[44px] rounded-md px-2 py-1 text-xs tabular-nums transition-colors ${
              activePreset === preset
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted border"
            }`}
          >
            {t("percentTotal", { total: preset })}
          </button>
        ))}
      </div>

      <input
        type="number"
        min={0}
        max={100}
        value={rawValue}
        onChange={(e) => {
          setRawValue(e.target.value);
          const val = parseInt(e.target.value, 10);
          if (!isNaN(val) && val >= 0 && val <= 100) {
            onUpdatePercentage(val);
          }
        }}
        onBlur={() => {
          const val = parseInt(rawValue, 10);
          if (isNaN(val) || val < 0 || val > 100) {
            setRawValue(String(selection.percentage));
          }
        }}
        className="border-input bg-background h-9 w-16 rounded-md border px-2 text-center text-sm tabular-nums"
        aria-label={t("percentageFor", { hero: selection.hero })}
      />

      <button
        type="button"
        onClick={onRemove}
        aria-label={t("removeHero", { hero: selection.hero })}
        className="text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] rounded-md p-2"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

const FUSE_HERO_ITEMS: FuseHeroItem[] = ALL_HEROES.map(({ name, role }) => ({
  name,
  role,
  searchKey: normalizeForSearch(name),
}));

function HeroCombobox({
  selectedHeroNames,
  preferredRole,
  onSelect,
}: {
  selectedHeroNames: Set<string>;
  preferredRole: RoleName | undefined;
  onSelect: (hero: string) => void;
}) {
  const t = useTranslations("ranked.form");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const fuse = useMemo(
    () =>
      new Fuse(FUSE_HERO_ITEMS, {
        includeScore: true,
        ignoreDiacritics: true,
        threshold: 0.2,
        keys: ["searchKey"],
      }),
    []
  );

  const roleOrder = useMemo(() => {
    const roles = Object.keys(HEROES_BY_ROLE) as RoleName[];
    if (!preferredRole) return roles;
    return [preferredRole, ...roles.filter((r) => r !== preferredRole)];
  }, [preferredRole]);

  const groupedHeroes = useMemo(() => {
    function available(name: string) {
      return !selectedHeroNames.has(name);
    }

    if (!search) {
      return roleOrder
        .map((role) => ({
          role,
          heroes: HEROES_BY_ROLE[role].filter(available),
        }))
        .filter((g) => g.heroes.length > 0);
    }

    const results = fuse
      .search(normalizeForSearch(search))
      .map((r) => r.item)
      .filter((item) => available(item.name));

    const grouped = new Map<RoleName, string[]>();
    for (const { name, role } of results) {
      if (!grouped.has(role)) grouped.set(role, []);
      grouped.get(role)!.push(name);
    }

    return roleOrder
      .filter((role) => grouped.has(role))
      .map((role) => ({ role, heroes: grouped.get(role)! }));
  }, [search, fuse, selectedHeroNames, roleOrder]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {t("addHero")}
          <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
        onWheel={handleComboboxWheel}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t("searchHeroes")}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{t("noHeroes")}</CommandEmpty>
            {groupedHeroes.map(({ role, heroes }) => (
              <CommandGroup key={role} heading={role}>
                {heroes.map((name) => (
                  <CommandItem
                    key={name}
                    value={name}
                    onSelect={() => {
                      onSelect(name);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Image
                      src={heroImageUrl(name)}
                      alt={name}
                      width={20}
                      height={20}
                      className="size-5 rounded-sm"
                    />
                    {name}
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

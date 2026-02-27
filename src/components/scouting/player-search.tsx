"use client";

import type { ScoutingPlayerSummary } from "@/data/player-scouting-dto";
import { cn } from "@/lib/utils";
import Fuse from "fuse.js";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useCallback, useMemo, useRef, useState } from "react";

type PlayerSearchProps = {
  players: ScoutingPlayerSummary[];
};

export function PlayerSearch({ players }: PlayerSearchProps) {
  const t = useTranslations("scoutingPage.player.search");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const fuse = useMemo(
    () =>
      new Fuse(players, {
        keys: ["name", "team", "role"],
        threshold: 0.3,
        includeScore: true,
        ignoreLocation: true,
      }),
    [players]
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query, { limit: 12 }).map((result) => result.item);
  }, [query, fuse]);

  const navigateToPlayer = useCallback(
    (player: ScoutingPlayerSummary) => {
      router.push(
        `/scouting/player/${encodeURIComponent(player.slug)}` as Route
      );
    },
    [router]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (results.length === 0) return;

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const nextIndex =
          activeIndex < results.length - 1 ? activeIndex + 1 : 0;
        setActiveIndex(nextIndex);
        scrollActiveIntoView(nextIndex);
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const prevIndex =
          activeIndex > 0 ? activeIndex - 1 : results.length - 1;
        setActiveIndex(prevIndex);
        scrollActiveIntoView(prevIndex);
        break;
      }
      case "Enter": {
        e.preventDefault();
        if (results[activeIndex]) {
          navigateToPlayer(results[activeIndex]);
        }
        break;
      }
      case "Escape": {
        e.preventDefault();
        setQuery("");
        setActiveIndex(0);
        inputRef.current?.blur();
        break;
      }
    }
  }

  function scrollActiveIntoView(index: number) {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[index] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }

  const showResults = query.trim().length > 0;
  const activeDescendant =
    results.length > 0 ? `player-result-${activeIndex}` : undefined;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="relative">
        <label htmlFor="player-search" className="sr-only">
          {t("label")}
        </label>
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id="player-search"
          type="search"
          role="combobox"
          aria-expanded={showResults && results.length > 0}
          aria-controls="player-results"
          aria-activedescendant={activeDescendant}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={t("placeholder")}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "border-input bg-background text-foreground placeholder:text-muted-foreground",
            "h-14 w-full rounded-xl border py-2 pr-4 pl-12 text-lg shadow-sm",
            "transition-shadow duration-150 outline-none",
            "focus:ring-ring/50 focus:border-ring focus:ring-[3px]",
            showResults && results.length > 0 && "rounded-b-none border-b-0"
          )}
        />
      </div>

      {showResults && (
        <ul
          ref={listRef}
          id="player-results"
          role="listbox"
          aria-label={t("resultsLabel")}
          className={cn(
            "border-input bg-background overflow-hidden rounded-b-xl border border-t-0 shadow-sm",
            "max-h-[400px] overflow-y-auto",
            "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150"
          )}
        >
          {results.length > 0 ? (
            results.map((player, index) => (
              <li
                key={`${player.slug}-${player.id}`}
                id={`player-result-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={cn(
                  "flex cursor-pointer items-center justify-between px-4 py-3",
                  "transition-colors duration-75",
                  index === activeIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => navigateToPlayer(player)}
              >
                <div className="flex items-baseline gap-2 overflow-hidden">
                  <span className="text-base font-semibold">{player.name}</span>
                  <span className="text-muted-foreground truncate text-sm">
                    {player.team}
                  </span>
                </div>
                <div className="text-muted-foreground flex shrink-0 items-center gap-3 text-sm">
                  {player.role && <RoleBadge role={player.role} />}
                  {player.region && <span>{player.region}</span>}
                </div>
              </li>
            ))
          ) : (
            <li className="text-muted-foreground px-4 py-6 text-center text-sm">
              {t("noResults")}
            </li>
          )}
        </ul>
      )}

      {!showResults && (
        <p className="text-muted-foreground mt-3 text-center text-sm">
          {t("helperText")}
        </p>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colorClass =
    role === "Tank"
      ? "bg-sky-500/15 text-sky-700 dark:text-sky-400"
      : role === "DPS"
        ? "bg-red-500/15 text-red-700 dark:text-red-400"
        : role === "Support"
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : "bg-muted text-muted-foreground";

  return (
    <span
      className={cn("rounded-md px-1.5 py-0.5 text-xs font-medium", colorClass)}
    >
      {role}
    </span>
  );
}

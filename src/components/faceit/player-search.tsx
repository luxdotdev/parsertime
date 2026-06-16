"use client";

import type { FaceitPlayerListEntry } from "@/data/faceit/player-types";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useCallback, useMemo, useRef, useState } from "react";

type FaceitPlayerSearchProps = {
  players: FaceitPlayerListEntry[];
};

export function FaceitPlayerSearch({ players }: FaceitPlayerSearchProps) {
  const t = useTranslations("faceitPlayerPage.search");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    return players
      .filter(
        (p) =>
          p.nickname.toLowerCase().includes(lower) ||
          p.battletag?.toLowerCase().includes(lower)
      )
      .slice(0, 12);
  }, [query, players]);

  const navigateToPlayer = useCallback(
    (player: FaceitPlayerListEntry) => {
      router.push(
        `/faceit/player/${encodeURIComponent(player.faceitPlayerId)}` as Route
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
    results.length > 0 ? `faceit-player-result-${activeIndex}` : undefined;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="relative">
        <label htmlFor="faceit-player-search" className="sr-only">
          {t("placeholder")}
        </label>
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id="faceit-player-search"
          type="search"
          role="combobox"
          aria-expanded={showResults && results.length > 0}
          aria-controls="faceit-player-results"
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
          id="faceit-player-results"
          role="listbox"
          aria-label={t("placeholder")}
          className={cn(
            "border-input bg-background overflow-hidden rounded-b-xl border border-t-0 shadow-sm",
            "max-h-[400px] overflow-y-auto",
            "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150"
          )}
        >
          {results.length > 0 ? (
            results.map((player, index) => (
              <li
                key={player.faceitPlayerId}
                id={`faceit-player-result-${index}`}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigateToPlayer(player);
                  }
                }}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="text-base font-semibold">
                    {player.nickname}
                  </span>
                  {player.battletag != null && (
                    <span className="text-muted-foreground truncate text-xs">
                      {player.battletag}
                    </span>
                  )}
                </span>
                <span className="ml-4 flex shrink-0 items-center gap-2">
                  <span className="text-muted-foreground text-sm tabular-nums">
                    {t("matches", { count: player.matchCount })}
                  </span>
                  {player.topFsr != null ? (
                    <span className="text-foreground text-sm font-medium tabular-nums">
                      {player.topFsr.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground rounded border px-1.5 py-0.5 text-xs">
                      {t("unrated")}
                    </span>
                  )}
                </span>
              </li>
            ))
          ) : (
            <li className="text-muted-foreground px-4 py-6 text-center text-sm">
              {t("noResults")}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

"use client";

import type { ScoutingTeam } from "@/data/scouting";
import { cn } from "@/lib/utils";
import Fuse from "fuse.js";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useCallback, useMemo, useRef, useState } from "react";

type TeamSearchProps = {
  teams: ScoutingTeam[];
};

export function TeamSearch({ teams }: TeamSearchProps) {
  const t = useTranslations("scoutingPage.search");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const fuse = useMemo(
    () =>
      new Fuse(teams, {
        keys: ["abbreviation", "fullName"],
        threshold: 0.3,
        includeScore: true,
        ignoreLocation: true,
      }),
    [teams]
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query, { limit: 12 }).map((result) => result.item);
  }, [query, fuse]);

  const navigateToTeam = useCallback(
    (team: ScoutingTeam) => {
      router.push(
        `/scouting/team/${encodeURIComponent(team.abbreviation)}` as Route
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
          navigateToTeam(results[activeIndex]);
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

  function formatWinRate(team: ScoutingTeam): string {
    if (team.matchCount === 0) return "0%";
    return `${Math.round((team.winCount / team.matchCount) * 100)}%`;
  }

  const showResults = query.trim().length > 0;
  const activeDescendant =
    results.length > 0 ? `team-result-${activeIndex}` : undefined;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="relative">
        <label htmlFor="team-search" className="sr-only">
          {t("label")}
        </label>
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id="team-search"
          type="search"
          role="combobox"
          aria-expanded={showResults && results.length > 0}
          aria-controls="team-results"
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
          id="team-results"
          role="listbox"
          aria-label={t("resultsLabel")}
          className={cn(
            "border-input bg-background overflow-hidden rounded-b-xl border border-t-0 shadow-sm",
            "max-h-[400px] overflow-y-auto",
            "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150"
          )}
        >
          {results.length > 0 ? (
            results.map((team, index) => (
              <li
                key={`${team.abbreviation}-${team.fullName}`}
                id={`team-result-${index}`}
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
                onClick={() => navigateToTeam(team)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigateToTeam(team);
                  }
                }}
              >
                <div className="flex items-baseline gap-2 overflow-hidden">
                  <span className="text-base font-semibold">
                    {team.abbreviation}
                  </span>
                  <span className="text-muted-foreground truncate text-sm">
                    {team.fullName}
                  </span>
                </div>
                <div className="text-muted-foreground flex shrink-0 items-center gap-3 text-sm tabular-nums">
                  <span>{t("matchCount", { count: team.matchCount })}</span>
                  <span className="font-medium">
                    {formatWinRate(team)} {t("winRate")}
                  </span>
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

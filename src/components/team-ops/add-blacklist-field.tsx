"use client";

import { cn } from "@/lib/utils";
import type { BlacklistSuggestion } from "@/lib/team-ops/blacklist";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import Fuse from "fuse.js";
import { useTranslations } from "next-intl";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

export type BlacklistSelection =
  | { kind: "team"; teamId: number; name: string }
  | { kind: "name"; name: string };

type AddBlacklistFieldProps = {
  suggestions: BlacklistSuggestion[];
  onSelect: (s: BlacklistSelection) => void;
};

export function AddBlacklistField({
  suggestions,
  onSelect,
}: AddBlacklistFieldProps) {
  const t = useTranslations("teamOps.blacklist");

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const pendingSelectionRef = useRef(false);
  const listboxId = useId();

  const fuse = useMemo(
    () =>
      new Fuse(suggestions, {
        keys: ["name"],
        threshold: 0.35,
        includeScore: true,
        ignoreLocation: true,
      }),
    [suggestions]
  );

  const trimmed = query.trim();

  const matchedSuggestions = useMemo(() => {
    if (!trimmed) return suggestions.slice(0, 20);
    return fuse.search(trimmed, { limit: 20 }).map((r) => r.item);
  }, [trimmed, fuse, suggestions]);

  const hasExactMatch = useMemo(
    () =>
      trimmed.length > 0 &&
      suggestions.some((s) => s.name.toLowerCase() === trimmed.toLowerCase()),
    [trimmed, suggestions]
  );

  // Total item count including optional off-platform row
  const showOffPlatformRow = trimmed.length > 0 && !hasExactMatch;
  const totalItems = matchedSuggestions.length + (showOffPlatformRow ? 1 : 0);

  const showDropdown = isFocused && (matchedSuggestions.length > 0 || showOffPlatformRow);
  const activeDescendant =
    totalItems > 0 ? `blacklist-result-${activeIndex}` : undefined;

  function scrollActiveIntoView(index: number) {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[index] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }

  const selectSuggestion = useCallback(
    (suggestion: BlacklistSuggestion) => {
      pendingSelectionRef.current = true;
      onSelect({ kind: "team", teamId: suggestion.teamId, name: suggestion.name });
      setQuery("");
      setActiveIndex(0);
      setIsFocused(false);
      inputRef.current?.blur();
    },
    [onSelect]
  );

  const selectOffPlatform = useCallback(() => {
    if (!trimmed) return;
    pendingSelectionRef.current = true;
    onSelect({ kind: "name", name: trimmed });
    setQuery("");
    setActiveIndex(0);
    setIsFocused(false);
    inputRef.current?.blur();
  }, [trimmed, onSelect]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return;

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const next = activeIndex < totalItems - 1 ? activeIndex + 1 : 0;
        setActiveIndex(next);
        scrollActiveIntoView(next);
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const prev = activeIndex > 0 ? activeIndex - 1 : totalItems - 1;
        setActiveIndex(prev);
        scrollActiveIntoView(prev);
        break;
      }
      case "Enter": {
        e.preventDefault();
        const isOffPlatformIndex =
          showOffPlatformRow && activeIndex === matchedSuggestions.length;
        if (isOffPlatformIndex) {
          selectOffPlatform();
        } else if (matchedSuggestions[activeIndex]) {
          selectSuggestion(matchedSuggestions[activeIndex]);
        }
        break;
      }
      case "Escape": {
        e.preventDefault();
        setQuery("");
        setActiveIndex(0);
        setIsFocused(false);
        inputRef.current?.blur();
        break;
      }
      case "Tab": {
        const isOffPlatformIndex =
          showOffPlatformRow && activeIndex === matchedSuggestions.length;
        if (isOffPlatformIndex) {
          selectOffPlatform();
        } else if (matchedSuggestions[activeIndex]) {
          selectSuggestion(matchedSuggestions[activeIndex]);
        }
        setIsFocused(false);
        break;
      }
    }
  }

  function handleBlur(e: React.FocusEvent) {
    if (listRef.current?.contains(e.relatedTarget)) return;
    setIsFocused(false);
    if (pendingSelectionRef.current) {
      pendingSelectionRef.current = false;
      return;
    }
    setQuery("");
    setActiveIndex(0);
  }

  return (
    <div className="relative">
      <div
        className={cn(
          "border-input bg-background flex items-center gap-2 rounded-md border px-3 py-1 shadow-sm transition-shadow",
          "focus-within:ring-ring/50 focus-within:border-ring focus-within:ring-[3px]",
          showDropdown && "rounded-b-none border-b-0"
        )}
      >
        <MagnifyingGlassIcon
          className="text-muted-foreground h-4 w-4 shrink-0"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-activedescendant={activeDescendant}
          aria-autocomplete="list"
          aria-label={t("addPlaceholder")}
          autoComplete="off"
          spellCheck={false}
          placeholder={t("searchPlaceholder")}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="text-foreground placeholder:text-muted-foreground h-8 w-full bg-transparent text-sm outline-none"
        />
      </div>

      {showDropdown && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={t("addPlaceholder")}
          className={cn(
            "border-input bg-background absolute right-0 left-0 z-50",
            "overflow-y-auto rounded-b-md border border-t-0 shadow-md",
            "max-h-56",
            "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-100"
          )}
        >
          {matchedSuggestions.length === 0 && !showOffPlatformRow && (
            <li className="text-muted-foreground px-3 py-4 text-center text-sm">
              {t("noMatches")}
            </li>
          )}

          {matchedSuggestions.map((suggestion, index) => (
            <li
              key={suggestion.teamId}
              id={`blacklist-result-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-75",
                index === activeIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault();
                selectSuggestion(suggestion);
              }}
            >
              <Avatar size="sm" className="shrink-0">
                {suggestion.image && (
                  <AvatarImage src={suggestion.image} alt={suggestion.name} />
                )}
                <AvatarFallback>
                  {suggestion.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{suggestion.name}</span>
            </li>
          ))}

          {showOffPlatformRow && (
            <>
              {matchedSuggestions.length > 0 && (
                <li role="presentation" className="border-input border-t" />
              )}
              <li
                id={`blacklist-result-${matchedSuggestions.length}`}
                role="option"
                aria-selected={activeIndex === matchedSuggestions.length}
                className={cn(
                  "flex cursor-pointer flex-col gap-0.5 px-3 py-2 text-sm transition-colors duration-75",
                  activeIndex === matchedSuggestions.length
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
                onMouseEnter={() => setActiveIndex(matchedSuggestions.length)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectOffPlatform();
                }}
              >
                <span>{t("blockOffPlatform", { name: trimmed })}</span>
                <span
                  className={cn(
                    "text-xs",
                    activeIndex === matchedSuggestions.length
                      ? "text-accent-foreground/70"
                      : "text-muted-foreground"
                  )}
                >
                  {t("offPlatform")}
                </span>
              </li>
            </>
          )}
        </ul>
      )}
    </div>
  );
}

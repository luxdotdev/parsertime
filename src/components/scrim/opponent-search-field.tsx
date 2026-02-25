"use client";

import { cn } from "@/lib/utils";
import { Cross2Icon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import Fuse from "fuse.js";
import { useCallback, useId, useMemo, useRef, useState } from "react";

type OpponentOption = {
  abbreviation: string;
  fullName: string;
};

type OpponentSearchFieldProps = {
  options: OpponentOption[];
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  id?: string;
};

export function OpponentSearchField({
  options,
  value,
  onChange,
  id,
}: OpponentSearchFieldProps) {
  const selectedTeam = options.find((o) => o.abbreviation === value) ?? null;

  const [query, setQuery] = useState(selectedTeam?.fullName ?? "");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const fuse = useMemo(
    () =>
      new Fuse(options, {
        keys: ["abbreviation", "fullName"],
        threshold: 0.35,
        includeScore: true,
        ignoreLocation: true,
      }),
    [options]
  );

  const results = useMemo(() => {
    if (!query.trim()) return options.slice(0, 20);
    return fuse.search(query, { limit: 20 }).map((r) => r.item);
  }, [query, fuse, options]);

  const showDropdown = isFocused && options.length > 0;
  const activeDescendant =
    results.length > 0 ? `opponent-result-${activeIndex}` : undefined;

  function scrollActiveIntoView(index: number) {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[index] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }

  const selectOption = useCallback(
    (option: OpponentOption) => {
      onChange(option.abbreviation);
      setQuery(option.fullName);
      setIsFocused(false);
      inputRef.current?.blur();
    },
    [onChange]
  );

  function clearSelection() {
    onChange(null);
    setQuery("");
    setActiveIndex(0);
    inputRef.current?.focus();
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setActiveIndex(0);
    if (value && newQuery !== selectedTeam?.fullName) {
      onChange(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return;

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const next = activeIndex < results.length - 1 ? activeIndex + 1 : 0;
        setActiveIndex(next);
        scrollActiveIntoView(next);
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const prev = activeIndex > 0 ? activeIndex - 1 : results.length - 1;
        setActiveIndex(prev);
        scrollActiveIntoView(prev);
        break;
      }
      case "Enter": {
        e.preventDefault();
        if (results[activeIndex]) {
          selectOption(results[activeIndex]);
        }
        break;
      }
      case "Escape": {
        e.preventDefault();
        if (value) {
          setQuery(selectedTeam?.fullName ?? "");
        } else {
          setQuery("");
        }
        setIsFocused(false);
        inputRef.current?.blur();
        break;
      }
      case "Tab": {
        if (results[activeIndex]) {
          selectOption(results[activeIndex]);
        }
        setIsFocused(false);
        break;
      }
    }
  }

  function handleBlur(e: React.FocusEvent) {
    if (listRef.current?.contains(e.relatedTarget)) return;
    setIsFocused(false);
    if (!value) {
      setQuery("");
    } else {
      setQuery(selectedTeam?.fullName ?? "");
    }
  }

  const isSelected = value !== null && value !== undefined && value !== "";

  return (
    <div className="relative">
      <div
        className={cn(
          "border-input bg-background flex items-center gap-2 rounded-md border px-3 py-1 shadow-sm transition-shadow",
          "focus-within:ring-ring/50 focus-within:border-ring focus-within:ring-[3px]",
          showDropdown && results.length > 0 && "rounded-b-none border-b-0"
        )}
      >
        <MagnifyingGlassIcon
          className="text-muted-foreground h-4 w-4 shrink-0"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={showDropdown && results.length > 0}
          aria-controls={listboxId}
          aria-activedescendant={activeDescendant}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search OWCS teams…"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="text-foreground placeholder:text-muted-foreground h-8 w-full bg-transparent text-sm outline-none"
        />
        {isSelected && (
          <button
            type="button"
            aria-label="Clear opponent selection"
            onClick={clearSelection}
            className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
          >
            <Cross2Icon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showDropdown && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="OWCS teams"
          className={cn(
            "border-input bg-background absolute left-0 right-0 z-50",
            "overflow-y-auto rounded-b-md border border-t-0 shadow-md",
            "max-h-52",
            "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-100"
          )}
        >
          {results.length > 0 ? (
            results.map((team, index) => (
              <li
                key={team.abbreviation}
                id={`opponent-result-${index}`}
                role="option"
                aria-selected={team.abbreviation === value}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors duration-75",
                  index === activeIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50",
                  team.abbreviation === value && "font-medium"
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectOption(team);
                }}
              >
                <span className="text-muted-foreground w-12 shrink-0 font-mono text-xs">
                  {team.abbreviation}
                </span>
                <span className="truncate">{team.fullName}</span>
              </li>
            ))
          ) : (
            <li className="text-muted-foreground px-3 py-4 text-center text-sm">
              No teams found.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

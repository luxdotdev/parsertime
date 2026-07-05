"use client";

import type {
  FindIndexResponse,
  FindSearchResponse,
} from "@/app/api/find/route";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

/**
 * Find's data layer, hybrid by design: a compact entity index (teams,
 * roster players, recent scrims) prefetched once when the dialog opens keeps
 * results local and instant, while per-phrase fetches cover the long tail of
 * older scrims. Phrase responses are cached by React Query, so re-typing a
 * phrase never re-fetches.
 */

export function useFindIndex(enabled: boolean) {
  return useQuery({
    queryKey: ["find-index"],
    queryFn: async (): Promise<FindIndexResponse> => {
      const res = await fetch("/api/find");
      if (!res.ok) throw new Error("Failed to load Find index");
      return (await res.json()) as FindIndexResponse;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useFindPhrase(phrase: string, enabled: boolean) {
  return useQuery({
    queryKey: ["find-phrase", phrase],
    queryFn: async (): Promise<FindSearchResponse> => {
      const res = await fetch(`/api/find?q=${encodeURIComponent(phrase)}`);
      if (!res.ok) throw new Error("Failed to search");
      return (await res.json()) as FindSearchResponse;
    },
    enabled: enabled && phrase.length >= 3,
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}

/**
 * Debounces the query into a fetchable phrase — with the Vercel Find
 * accelerator: a non-alphanumeric keystroke (space, dash, …) flushes
 * immediately, since a completed word is exactly when more data helps.
 */
export function useDebouncedPhrase(query: string, delay = 250): string {
  const [phrase, setPhrase] = useState("");

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setPhrase("");
      return;
    }
    if (/[^\p{L}\p{N}]$/u.test(query)) {
      setPhrase(trimmed);
      return;
    }
    const timer = setTimeout(() => setPhrase(trimmed), delay);
    return () => clearTimeout(timer);
  }, [query, delay]);

  return phrase;
}

"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "parsertime-landing-visited";

export function useFirstVisit(): boolean {
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    try {
      const visited = sessionStorage.getItem(STORAGE_KEY);
      if (!visited) {
        setIsFirstVisit(true);
        sessionStorage.setItem(STORAGE_KEY, "1");
      }
    } catch {
      // sessionStorage unavailable (e.g. incognito in some browsers)
    }
  }, []);

  return isFirstVisit;
}

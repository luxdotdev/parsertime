"use client";

import { track } from "@/lib/usage/client";
import { UsageEventName } from "@/lib/usage/names";
import { useEffect } from "react";

/**
 * Fires a stats.view once when a scrim's parsed map stats are viewed. This is
 * the final step of the activation funnel. Renders nothing.
 */
export function StatsViewBeacon() {
  useEffect(() => {
    track(UsageEventName.STATS_VIEW);
  }, []);

  return null;
}

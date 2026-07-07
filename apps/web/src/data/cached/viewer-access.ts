import "server-only";

import { isAuthedToViewScrim, isAuthedToViewTeam } from "@/lib/auth";
import { cacheLife } from "next/cache";

// Private-cached access gates for `generateMetadata` ONLY. With streamed
// metadata under PPR, the <title> chunk flushes whenever generateMetadata
// resolves — an uncached session read plus a chain of authorization queries
// pushes the title to the tail of the stream, so the tab shows the raw URL
// until it lands (and a rejection means it never does). Caching the gate lets
// the metadata path resolve from the browser's private cache on navigation.
//
// These are NOT a security boundary: page content must keep its own live
// `isAuthedToView*` gate. A stale entry here only affects which title/OG copy
// renders for up to the stale window after access changes.

export async function getCachedCanViewScrim(scrimId: number) {
  "use cache: private";
  // stale >= 30s is required for runtime prefetching; "minutes" keeps the
  // metadata revocation lag bounded at the profile's 5-minute client window.
  cacheLife("minutes");
  return isAuthedToViewScrim(scrimId);
}

export async function getCachedCanViewTeam(teamId: number) {
  "use cache: private";
  cacheLife("minutes");
  return isAuthedToViewTeam(teamId);
}

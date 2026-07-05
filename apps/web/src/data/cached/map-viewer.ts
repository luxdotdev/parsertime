import "server-only";

import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth, isAuthedToViewMap, type Session } from "@/lib/auth";
import { getColorblindMode } from "@/lib/server-utils";
import type { User } from "@/generated/prisma/browser";
import { Effect } from "effect";
import { cacheLife } from "next/cache";

export type MapViewerContext =
  | { canView: false }
  | {
      canView: true;
      session: Session | null;
      user: User | null;
      team1Color: string;
      team2Color: string;
    };

/**
 * The per-viewer request work for a map page render — access gate, session,
 * user row, and colorblind palette — in one `"use cache: private"` scope.
 *
 * Private caching serves two purposes: it lets Next's runtime prefetch
 * (`prefetch = 'allow-runtime'` on the map page) execute this and everything
 * behind it ahead of a tab click (uncached session/DB reads would otherwise
 * abort the prefetch at the surrounding Suspense boundary), and it lets the
 * browser reuse the result across tab navigations within the stale window.
 * Results live only in the browser's memory, never on the server.
 */
export async function getMapViewerContext(
  scrimId: number,
  mapId: number
): Promise<MapViewerContext> {
  "use cache: private";
  // stale >= 30s is required for runtime prefetching; "minutes" keeps access
  // revocation lag bounded at the profile's 5-minute client stale window.
  cacheLife("minutes");

  if (!(await isAuthedToViewMap(scrimId, mapId))) {
    return { canView: false };
  }

  const session = await auth();
  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session?.user?.email)))
  );
  const { team1, team2 } = await getColorblindMode(user?.id ?? "");

  return { canView: true, session, user, team1Color: team1, team2Color: team2 };
}

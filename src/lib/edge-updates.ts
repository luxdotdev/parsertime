import 'server-only';
import { get } from '@vercel/edge-config';

/**
 * Shape of the `latestUpdates` key in the shared Vercel Edge Config store.
 * Matches `src/components/home/new-landing/landing-page.tsx` in the main
 * parsertime repo so a single edit to the edge config updates both surfaces.
 */
export type LatestUpdate = {
  title: string;
  url: string;
};

const FALLBACK: LatestUpdate = {
  title: 'v3.0 · TSR, Matchmaker, Telemetry',
  url: '#landing-changelog',
};

export async function getLatestUpdate(): Promise<LatestUpdate> {
  // No EDGE_CONFIG env var (local dev, preview without binding): use fallback
  // so the page still renders something sensible.
  if (!process.env.EDGE_CONFIG) return FALLBACK;

  try {
    const result = await get<LatestUpdate>('latestUpdates');
    if (
      !result ||
      typeof result.title !== 'string' ||
      typeof result.url !== 'string'
    ) {
      return FALLBACK;
    }
    return result;
  } catch {
    // Edge config unreachable, malformed token, etc. Stay graceful.
    return FALLBACK;
  }
}
